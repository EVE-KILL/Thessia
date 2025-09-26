import {
    CharacterService,
    FactionService,
    UserService,
} from "../../../../services";

export default defineEventHandler(async (event) => {
    // Admin authentication check
    const cookie = getCookie(event, "evelogin");
    if (!cookie) {
        throw createError({
            statusCode: 401,
            statusMessage: "Authentication required",
        });
    }

    const user = await UserService.findByUniqueIdentifier(cookie);
    if (user?.role !== "admin") {
        throw createError({
            statusCode: 403,
            statusMessage: "Administrator privileges required",
        });
    }

    const characterId = parseInt(getRouterParam(event, "id") || "0");
    if (!characterId) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid character ID",
        });
    }

    try {
        // Get character data with related entities
        const character = await CharacterService.findWithRelations(characterId);

        if (!character) {
            throw createError({
                statusCode: 404,
                statusMessage: "Character not found",
            });
        }

        // Get faction name if needed
        let factionName = null;
        if (character.faction_id) {
            const faction = await FactionService.findById(character.faction_id);
            factionName = faction?.name;
        }

        return {
            character: {
                character_id: character.character_id,
                name: character.name,
                description: character.description,
                birthday: character.birthday,
                gender: character.gender,
                race_id: character.race_id,
                security_status: character.security_status,
                bloodline_id: character.bloodline_id,
                corporation_id: character.corporation_id,
                alliance_id: character.alliance_id,
                faction_id: character.faction_id,
                deleted: character.deleted,
                last_active: character.last_active,
                created_at: character.created_at,
                updated_at: character.updated_at,
            },
            names: {
                corporationName: character.corporation?.name || null,
                allianceName: character.alliance?.name || null,
                factionName,
            },
        };
    } catch (error: any) {
        console.error("Error fetching character details:", error);

        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to fetch character details",
        });
    }
});
