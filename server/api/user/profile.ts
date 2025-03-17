import { getJwtFromEvent, verifyJwtToken } from '~/server/utils/auth.utils';
import { Users } from '~/server/models/Users';

export default defineEventHandler(async (event) => {
  try {
    // Get JWT token
    const token = getJwtFromEvent(event);

    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      });
    }

    // Verify JWT
    const { characterId } = verifyJwtToken(token);

    // Find user in database
    const user = await Users.findOne({ characterId });

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      });
    }

    // Return sanitized user profile
    return {
      characterId: user.characterId,
      characterName: user.characterName,
      scopes: user.scopes,
      canFetchCorporationKillmails: user.canFetchCorporationKillmails,
      dateExpiration: user.dateExpiration,
      createdAt: user.createdAt
    };

  } catch (error) {
    console.debug('Get profile error:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to get user profile'
    });
  }
});
