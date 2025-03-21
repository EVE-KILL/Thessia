import { getAlliance, getCharacter, getCorporation } from "~/server/helpers/ESIData";
import { Users } from "../../models/Users";
import { IAlliance } from "~/server/interfaces/IAlliance";

export default defineEventHandler(async (event) => {
    // Add cache-control headers to prevent caching
    setResponseHeaders(event, {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });

    // Get the cookie value using the hardcoded cookie name
    const cookieName = 'evelogin';
    const cookie = getCookie(event, cookieName);

    if (!cookie) {
        return {
            authenticated: false,
            user: null,
        };
    }

    // Find the user by uniqueIdentifier
    const user = await Users.findOne({ uniqueIdentifier: cookie });

    if (!user) {
        return {
            authenticated: false,
            user: null,
        };
    }

    try {
        // Fetch character, corporation, and alliance data
        const characterData = await getCharacter(user.characterId);
        const corporationData = await getCorporation(characterData.corporation_id);

        // Initialize alliance data with defaults
        let allianceData: Partial<IAlliance> = {
            alliance_id: 0,
            name: '',
        };

        // Fetch alliance data if the character is in an alliance
        if (corporationData.alliance_id > 0) {
            allianceData = await getAlliance(corporationData.alliance_id);
        }

        // Return comprehensive user data
        return {
            authenticated: true,
            user: {
                // Basic character info
                characterId: user.characterId,
                characterName: user.characterName,

                // Corporation info
                corporationId: corporationData.corporation_id,
                corporationName: corporationData.name,

                // Alliance info
                allianceId: allianceData.alliance_id,
                allianceName: allianceData.name,

                // Authentication info
                scopes: user.scopes,
                canFetchCorporationKillmails: user.canFetchCorporationKillmails,
                dateExpiration: user.dateExpiration,
                administrator: user.administrator,

                // Additional profile data
                createdAt: user.createdAt,
                lastChecked: user.lastChecked,
            },
        };
    } catch (error) {
        console.debug('Error fetching user data:', error);

        // If external ESI data fails, return basic user info from database
        return {
            authenticated: true,
            user: {
                characterId: user.characterId,
                characterName: user.characterName,
                corporationId: null,
                corporationName: null,
                allianceId: null,
                allianceName: null,
                scopes: user.scopes,
                canFetchCorporationKillmails: user.canFetchCorporationKillmails,
                dateExpiration: user.dateExpiration,
                administrator: user.administrator,
                createdAt: user.createdAt,
            },
        };
    }
});
