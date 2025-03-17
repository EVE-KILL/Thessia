import { Users } from '~/server/models/Users';
import { refreshAccessToken } from './auth.utils';

/**
 * Utility to check and refresh access tokens
 * @param characterId The EVE character ID
 * @returns The user with valid access token
 */
export async function ensureValidToken(characterId: number) {
  // Find user
  const user = await Users.findOne({ characterId });

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    });
  }

  // Check if token is expired or about to expire (in next 5 minutes)
  const now = new Date();
  const tokenExpiresIn = (user.dateExpiration.getTime() - now.getTime()) / 1000; // in seconds

  // If token is still valid for more than 5 minutes
  if (tokenExpiresIn > 300) {
    return user;
  }

  console.debug(`Token for character ${characterId} expires in ${tokenExpiresIn}s. Refreshing...`);

  try {
    // Refresh token
    const tokenResponse = await refreshAccessToken(user.refreshToken);

    // Calculate new expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.expires_in);

    // Update user in database
    await Users.updateOne(
      { characterId },
      {
        $set: {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token || user.refreshToken,
          dateExpiration: expiresAt,
          lastChecked: new Date()
        }
      }
    );

    // Return updated user
    return await Users.findOne({ characterId });

  } catch (error) {
    console.debug(`Failed to refresh token for character ${characterId}:`, error);
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication refresh failed. Please login again.'
    });
  }
}

/**
 * Generic function to make authenticated ESI requests with token management
 * @param characterId Character ID for authentication
 * @param url ESI endpoint URL
 * @param options Fetch options
 * @returns Fetch response
 */
export async function authenticatedEsiRequest(
  characterId: number,
  url: string,
  options: RequestInit = {}
) {
  try {
    // Get user with valid token
    const user = await ensureValidToken(characterId);

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      });
    }

    // Set up headers with authentication
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${user.accessToken}`);

    // Make the request
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      // Handle ESI specific errors
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));

      throw createError({
        statusCode: response.status,
        statusMessage: `ESI request failed: ${error.error || response.statusText}`
      });
    }

    return response;

  } catch (error) {
    console.debug('ESI request error:', error);
    throw error;
  }
}
