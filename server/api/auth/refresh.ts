import { getJwtFromEvent, verifyJwtToken, refreshAccessToken, verifyToken } from '~/server/utils/auth.utils';
import { Users } from '~/server/models/Users';

/**
 * Refreshes the access token for a user
 *
 * @route POST /api/auth/refresh
 * @returns {Object} Object containing success status and expiration time
 */
export default defineEventHandler(async (event) => {
  try {
    // Get JWT from request
    const token = getJwtFromEvent(event);

    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: 'No authentication token found'
      });
    }

    // Verify JWT
    const { characterId } = verifyJwtToken(token);

    // Find user
    const user = await Users.findOne({ characterId });

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      });
    }

    // Refresh the access token
    const tokenResponse = await refreshAccessToken(user.refreshToken);

    // Verify new token
    const verifyResponse = await verifyToken(tokenResponse.access_token);

    // Update expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.expires_in);

    // Update user in database
    await Users.updateOne(
      { characterId },
      {
        $set: {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token || user.refreshToken, // Sometimes refresh tokens aren't returned
          dateExpiration: expiresAt,
          lastChecked: new Date(),
          scopes: verifyResponse.Scopes.split(' '),
          canFetchCorporationKillmails: verifyResponse.Scopes.includes('esi-killmails.read_corporation_killmails.v1')
        }
      }
    );

    // Return success
    return {
      success: true,
      message: 'Token refreshed successfully',
      expiresAt
    };

  } catch (error) {
    console.debug('Refresh error:', error);

    // Handle more specific errors
    if (error.statusCode) {
      throw error; // Re-throw if it's already a properly formatted error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to refresh token',
      data: { error: error.message }
    });
  }
});
