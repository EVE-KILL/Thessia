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
        const corporation = await Corporations.findOne({
            corporation_id: character.corporation_id,
        });
        let alliance = null;
        if ((character?.alliance_id ?? 0) > 0) {
            alliance = await Alliances.findOne({
                alliance_id: character.alliance_id,
            });
        }
        let faction = null;
        if ((character?.faction_id ?? 0) > 0) {
            faction = await Factions.findOne({
                faction_id: character.faction_id,
            });
        }

        // Load the bloodline data
        const bloodline = await Bloodlines.findOne({
            bloodline_id: character.bloodline_id,
        });
        const race = await Races.findOne({ race_id: character.race_id });

        // Load character achievements if they exist
        const achievements = await CharacterAchievements.findOne({
            character_id: characterId,
        });

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
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
        getKey: (event) => {
            const characterId = event.context.params?.id;
            // Check for query parameters if needed, but based on the handler code, none are used.
            return `characters:${characterId}:index`;
        },
    }
);
