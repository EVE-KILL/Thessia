import { getJwtFromEvent, verifyJwtToken } from '~/server/utils/auth.utils';
import { Users } from '~/server/models/Users';

export default defineEventHandler(async (event) => {
  try {
    // Get JWT from request
    const token = getJwtFromEvent(event);

    if (!token) {
      return {
        authenticated: false,
        message: 'No authentication token found'
      };
    }

    // Verify JWT
    const { characterId } = verifyJwtToken(token);

    // Check if user exists in DB
    const user = await Users.findOne({ characterId });

    if (!user) {
      return {
        authenticated: false,
        message: 'User not found'
      };
    }

    // Check if token is expired
    const now = new Date();
    if (user.dateExpiration < now) {
      return {
        authenticated: false,
        message: 'Authentication expired',
        requiresRefresh: true
      };
    }

    // Return user info without sensitive fields
    return {
      authenticated: true,
      user: {
        characterId: user.characterId,
        characterName: user.characterName,
        scopes: user.scopes,
        canFetchCorporationKillmails: user.canFetchCorporationKillmails,
        dateExpiration: user.dateExpiration
      }
    };

  } catch (error) {
    console.debug('Verify error:', error);
    return {
      authenticated: false,
      message: error instanceof Error ? error.message : 'Authentication failed'
    };
  }
});
