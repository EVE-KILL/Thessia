import { getJwtFromEvent, verifyJwtToken } from '~/server/utils/auth.utils';
import { Users } from '~/server/models/Users';
import { getAlliance, getCharacter, getCorporation } from '~/server/helpers/ESIData';

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

    // Fetch additional character information
    const characterData = await getCharacter(characterId);
    let corporationData = null;
    let allianceData = null;

    // Get corporation info if available
    if (characterData && characterData.corporation_id) {
      corporationData = await getCorporation(characterData.corporation_id);
    }

    // Get alliance info if available
    if (characterData && characterData.alliance_id) {
      allianceData = await getAlliance(characterData.alliance_id);
    }

    // Format the expiration date in 24h UTC format
    const expirationDate = user.dateExpiration;
    const formattedExpirationDate = expirationDate.toISOString();

    // Return user info without sensitive fields
    return {
      authenticated: true,
      user: {
        characterId: user.characterId,
        characterName: user.characterName,
        corporationId: characterData?.corporation_id || null,
        corporationName: corporationData?.name || null,
        allianceId: characterData?.alliance_id || null,
        allianceName: allianceData?.name || null,
        scopes: user.scopes,
        canFetchCorporationKillmails: user.canFetchCorporationKillmails,
        dateExpiration: formattedExpirationDate,
        administrator: user.administrator || false
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
