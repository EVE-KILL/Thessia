import {
    AllianceService,
    BloodlineService,
    CharacterAchievementService,
    CorporationService,
    FactionService,
    RaceService,
} from "~/server/services";

export default defineCachedEventHandler(
    async (event) => {
        const characterId: number | null = event.context.params?.id
            ? Number.parseInt(event.context.params.id)
            : null;
        if (!characterId) {
            return { error: "Character ID not provided" };
        }

        const character = await getCharacter(characterId);

        // Add corporation and alliance names
        const corporation = character.corporation_id
            ? await CorporationService.findById(character.corporation_id)
            : null;
        let alliance = null;
        if ((character?.alliance_id ?? 0) > 0) {
            alliance = await AllianceService.findById(character.alliance_id!);
        }
        let faction = null;
        if ((character?.faction_id ?? 0) > 0) {
            faction = await FactionService.findById(character.faction_id!);
        }

        // Load the bloodline and race data using services
        const bloodline = character.bloodline_id
            ? await BloodlineService.findById(character.bloodline_id)
            : null;
        const race = character.race_id
            ? await RaceService.findById(character.race_id)
            : null;

        // Load character achievements using service
        const achievements = await CharacterAchievementService.findByCharacterId(
            characterId
        );

        // Add the corporation and alliance names to the character object
        // And add in all the race and bloodline data
        const characterData = (character as any).toObject
            ? (character as any).toObject()
            : character;
        const enhancedCharacter = {
            ...characterData,
            corporation_name: corporation?.name || null,
            corporation_ticker: corporation?.ticker || null,
            alliance_name: alliance?.name || null,
            alliance_ticker: alliance?.ticker || null,
            faction_name: faction?.name || null,
            bloodline_name: bloodline?.bloodline_name || null,
            bloodline_description: bloodline?.description || null,
            race_name: race?.race_name,
            race_description: race?.description,
            achievements: achievements || null,
        };

        return enhancedCharacter;
    },
    {
        maxAge: 3600,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const characterId = event.context.params?.id;
            // Check for query parameters if needed, but based on the handler code, none are used.
            return `characters:${characterId}:index`;
        },
    }
);
