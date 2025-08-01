async function fetchESIKillmail(
    killmailId: number,
    killmailHash: string
): Promise<IESIKillmail> {
    // Check if the killmail is in the KillmailESI model first
    const dbKillmail: IESIKillmail | null = await KillmailsESI.findOne(
        { killmail_id: killmailId },
        { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }
    );
    if (dbKillmail) {
        return dbKillmail;
    }

    try {
        const esiKillmail: IESIKillmail = await esiFetcher(
            `${
                process.env.ESI_URL || "https://esi.evetech.net/"
            }latest/killmails/${killmailId}/${killmailHash}/`
        );
        esiKillmail.killmail_hash = killmailHash;

        // Insert the killmail into the esi killmails table
        const km = new KillmailsESI(esiKillmail);

        try {
            await km.save();
        } catch (err) {
            await km.updateOne({ killmail_id: killmailId }, esiKillmail);
        }

        return esiKillmail;
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        const errorResponse =
            error && typeof error === "object" && "response" in error
                ? error.response
                : "";
        throw new Error(`error: ${errorMessage} | response: ${errorResponse}`);
    }
}

async function getCharacter(
    character_id: number,
    force_update = false
): Promise<Partial<ICharacter>> {
    let character: ICharacter | null = null;
    const now = new Date();
    // When force_update is true, check if the character was updated in the last 24h, if it was return that - otherwise check the last 30 days (This prevents spamming the ESI API, seeing as characters can't change corporations more than every 24h anyway)
    const daysAgo = force_update
        ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
        : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ID conflict check
    const allianceConflict = await Alliances.findOne({
        alliance_id: character_id,
    });
    const corporationConflict = await Corporations.findOne({
        corporation_id: character_id,
    });
    if (allianceConflict || corporationConflict) {
        // If we have character data that is not deleted, we need to delete the alliance or corporation and create the character instead
        throw new Error(
            `ID conflict: Character ID ${character_id} already exists as an alliance or corporation.`
        );
    }

    character = await Characters.findOne(
        {
            character_id: character_id,
            updatedAt: { $gte: daysAgo },
        },
        { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }
    );

    if (character) {
        return character;
    }

    // Fetch character from external API if not found or outdated
    let data: ICharacter | null = await esiFetcher(
        `${
            process.env.ESI_URL || "https://esi.evetech.net/"
        }latest/characters/${character_id}/?datasource=tranquility`
    );

    // Handle errors
    if (data.error) {
        switch (data.error) {
            case "Character has been deleted!":
                data = await deletedCharacterInfo(character_id);
                break;
            case "Character not found":
                // This should return a partial ICharacter object
                return {
                    character_id: character_id,
                    error: "Character not found",
                } as Partial<ICharacter>;
            default:
                throw new Error(
                    `ESI Error: ${data.error} | URL: ${
                        process.env.ESI_URL || "https://esi.evetech.net/"
                    }latest/characters/${character_id}/?datasource=tranquility`
                );
        }
    }

    // Add character_id and preserve existing history if it exists
    data.character_id = character_id;
    const existingCharacter = await Characters.findOne({
        character_id: character_id,
    });
    data.history = data.history || existingCharacter?.history || [];

    // Ensure ESI takes precedence for alliance and faction fields
    // Handle cases where character left alliance/faction (ESI returns null/undefined)
    if (
        data.alliance_id === null ||
        data.alliance_id === undefined ||
        data.alliance_id === 0
    ) {
        data.alliance_id = 0;
        data.alliance_name = "";
    }
    if (
        data.faction_id === null ||
        data.faction_id === undefined ||
        data.faction_id === 0
    ) {
        data.faction_id = 0;
        data.faction_name = "";
    }

    // If character doesn't have alliance info but has corporation, derive alliance from corporation
    if (
        data.alliance_id === 0 &&
        data.corporation_id &&
        data.corporation_id > 0
    ) {
        try {
            const corporation = await getCorporation(data.corporation_id);
            if (corporation.alliance_id && corporation.alliance_id > 0) {
                data.alliance_id = corporation.alliance_id;
                data.alliance_name = corporation.alliance_name || "";
            }
        } catch (error) {
            console.log(
                `Failed to derive alliance from corporation ${data.corporation_id} for character ${character_id}:`,
                error instanceof Error ? error.message : String(error)
            );
        }
    }

    // Only queue history update if:
    // 1. Character isn't deleted
    // 2. Current corporation_id doesn't match latest history entry
    // 3. We have no history entries
    // 4. Alliance status changed (from database vs ESI)
    const shouldUpdateHistory =
        !data.deleted &&
        (data.history.length === 0 ||
            data.corporation_id !== data.history[0]?.corporation_id ||
            (existingCharacter &&
                existingCharacter.alliance_id !== data.alliance_id));

    if (shouldUpdateHistory) {
        await queueUpdateCharacterHistory(character_id);
    }

    // Save character to database
    const characterModel = new Characters(data);
    try {
        await characterModel.save();
    } catch (error) {
        await Characters.updateOne({ character_id: character_id }, data);
    }

    // Return character
    return data;
}

async function deletedCharacterInfo(character_id: number): Promise<ICharacter> {
    const existingCharacter: ICharacter | null = await Characters.findOne(
        { character_id: character_id },
        { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }
    );
    return {
        character_id: character_id,
        name: existingCharacter?.name || "Deleted",
        description:
            existingCharacter?.description || "This character has been deleted",
        birthday:
            existingCharacter?.birthday || new Date("2003-01-01 00:00:00"),
        gender: existingCharacter?.gender || "Unknown",
        race_id: existingCharacter?.race_id || 0,
        security_status: existingCharacter?.security_status || 0,
        bloodline_id: existingCharacter?.bloodline_id || 0,
        corporation_id: existingCharacter?.corporation_id || 0,
        alliance_id: existingCharacter?.alliance_id || 0,
        faction_id: existingCharacter?.faction_id || 0,
        history: existingCharacter?.history || [],
        deleted: true,
    };
}

async function getCharacterHistory(
    character_id: number
): Promise<Record<string, any>[]> {
    const character = await Characters.findOne({ character_id: character_id });
    if (!character) {
        return [];
    }

    try {
        const history = await esiFetcher(
            `${
                process.env.ESI_URL || "https://esi.evetech.net/"
            }latest/characters/${character_id}/corporationhistory/?datasource=tranquility`
        );

        // Update character with new history
        await Characters.updateOne(
            { character_id: character_id },
            { $set: { history: history } },
            { upsert: true }
        );

        return history;
    } catch (error) {
        // If there's an error fetching history, return empty array
        return [];
    }
}

async function getCorporation(
    corporation_id: number,
    force_update = false
): Promise<ICorporation> {
    const now = new Date();
    const daysAgo = force_update
        ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
        : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ID conflict check
    const characterConflict = await Characters.findOne({
        character_id: corporation_id,
    });
    const allianceConflict = await Alliances.findOne({
        alliance_id: corporation_id,
    });
    if (characterConflict || allianceConflict) {
        throw new Error(
            `ID conflict: Corporation ID ${corporation_id} already exists as a character or alliance.`
        );
    }

    const corporation: ICorporation | null = await Corporations.findOne(
        {
            corporation_id: corporation_id,
            updatedAt: { $gte: daysAgo },
        },
        { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }
    );

    if (corporation) {
        return corporation;
    }

    // Fetch corporation from external API if not found or outdated
    const data = await esiFetcher(
        `${
            process.env.ESI_URL || "https://esi.evetech.net/"
        }latest/corporations/${corporation_id}/?datasource=tranquility`
    );

    // Add corporation_id and preserve existing history if it exists
    data.corporation_id = corporation_id;
    const existingCorporation = await Corporations.findOne({
        corporation_id: corporation_id,
    });
    data.history = data.history || existingCorporation?.history || [];

    // Ensure ESI takes precedence for alliance and faction fields
    // Handle cases where corporation left alliance/faction (ESI returns null/undefined)
    if (
        data.alliance_id === null ||
        data.alliance_id === undefined ||
        data.alliance_id === 0
    ) {
        data.alliance_id = 0;
        data.alliance_name = "";
    }
    if (
        data.faction_id === null ||
        data.faction_id === undefined ||
        data.faction_id === 0
    ) {
        data.faction_id = 0;
        data.faction_name = "";
    }

    // Only queue history update if:
    // 1. Current alliance_id doesn't match latest history entry
    // 2. We have no history entries
    // 3. Alliance status changed from what's in database
    const shouldUpdateHistory =
        data.history.length === 0 ||
        data.alliance_id !== data.history[0]?.alliance_id ||
        (existingCorporation &&
            existingCorporation.alliance_id !== data.alliance_id);

    if (shouldUpdateHistory) {
        await queueUpdateCorporationHistory(corporation_id);
    }

    // Save corporation to database
    const corporationModel = new Corporations(data);
    try {
        await corporationModel.save();
    } catch (error) {
        await Corporations.updateOne({ corporation_id: corporation_id }, data);
    }

    // Return corporation
    return data;
}

async function getCorporationHistory(
    corporation_id: number
): Promise<Record<string, any>[]> {
    const corporation = await Corporations.findOne({
        corporation_id: corporation_id,
    });
    const history = await esiFetcher(
        `${
            process.env.ESI_URL || "https://esi.evetech.net/"
        }latest/corporations/${corporation_id}/alliancehistory/?datasource=tranquility`
    );

    corporation.history = history;
    await Corporations.updateOne(
        { corporation_id: corporation_id },
        { $set: { history: history } }
    );

    return history;
}

async function getAlliance(
    alliance_id: number,
    force_update = false
): Promise<IAlliance> {
    const now = new Date();
    const daysAgo = force_update
        ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
        : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ID conflict check
    const characterConflict = await Characters.findOne({
        character_id: alliance_id,
    });
    const corporationConflict = await Corporations.findOne({
        corporation_id: alliance_id,
    });
    if (characterConflict || corporationConflict) {
        throw new Error(
            `ID conflict: Alliance ID ${alliance_id} already exists as a character or corporation.`
        );
    }

    const alliance: IAlliance | null = await Alliances.findOne(
        {
            alliance_id: alliance_id,
            updatedAt: { $gte: daysAgo },
        },
        { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }
    );

    if (alliance) {
        return alliance;
    }

    // Fetch alliance from external API if not found or outdated
    const data = await esiFetcher(
        `${
            process.env.ESI_URL || "https://esi.evetech.net/"
        }latest/alliances/${alliance_id}/?datasource=tranquility`
    );

    // Add alliance_id to data
    data.alliance_id = alliance_id;

    // Ensure ESI takes precedence for faction fields
    // Handle cases where alliance left faction (ESI returns null/undefined)
    if (
        data.faction_id === null ||
        data.faction_id === undefined ||
        data.faction_id === 0
    ) {
        data.faction_id = 0;
        data.faction_name = "";
    }

    // Save alliance to database
    const allianceModel = new Alliances(data);
    try {
        await allianceModel.save();
    } catch (error) {
        await Alliances.updateOne({ alliance_id: alliance_id }, data);
    }

    // Return alliance
    return data;
}

async function getFaction(faction_id: number): Promise<IFaction | null> {
    const faction: IFaction | null = await Factions.findOne(
        { faction_id: faction_id },
        { _id: 0, __v: 0, createdAt: 0 }
    );

    // Factions don't have a history, and can't be fetched from ESI, so if it doesn't exist in the database, return null
    return faction;
}

async function getItem(item_id: number): Promise<IItem> {
    return await InvTypes.findOne(
        { type_id: item_id },
        { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }
    );
}

async function getWar(war_id: number): Promise<IWar> {
    const data = await esiFetcher(
        `${
            process.env.ESI_URL || "https://esi.evetech.net/"
        }latest/wars/${war_id}/?datasource=tranquility`
    );

    // id is already set, delete it and add it again as war_id
    delete data.id;
    data.war_id = war_id;

    // Save war to database
    const warModel = new Wars(data);
    try {
        await warModel.save();
    } catch (error) {
        await Wars.updateOne({ war_id: war_id }, data);
    }

    // Return war
    return data;
}

async function getWarKillmails(
    war_id: number
): Promise<{ killmail_id: number; killmail_hash: string }[]> {
    const data = await esiFetcher(
        `${
            process.env.ESI_URL || "https://esi.evetech.net/"
        }latest/wars/${war_id}/killmails/?datasource=tranquility`
    );

    return data;
}

export {
    fetchESIKillmail,
    getAlliance,
    getCharacter,
    getCharacterHistory,
    getCorporation,
    getCorporationHistory,
    getFaction,
    getItem,
    getWar,
    getWarKillmails,
};
