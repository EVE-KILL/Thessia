import { cliLogger } from "../../server/helpers/Logger";
import { getCachedFaction } from "../../server/helpers/RuntimeCache";
import type {
    ICharacter,
    ICharacterHistory,
} from "../../server/interfaces/ICharacter";
import { Alliances } from "../../server/models/Alliances";
import { Characters } from "../../server/models/Characters";
import { Corporations } from "../../server/models/Corporations";
import { queueUpdateCharacterHistory } from "../../server/queue/Character";
import { getEsiClient } from "../client";
import { getAllianceService } from "./alliance";
import { getCorporationService } from "./corporation";

/**
 * Character service with proper caching and data management
 */
export class CharacterService {
    private esi = getEsiClient().esi;
    private corporationService = getCorporationService();
    private allianceService = getAllianceService();

    /**
     * Get character data with intelligent caching
     * @param character_id Character ID to fetch
     * @param maxAgeHours Maximum age in hours before refetching (default: 24)
     */
    async getCharacter(
        character_id: number,
        maxAgeHours: number = 24
    ): Promise<ICharacter> {
        // Check for ID conflicts
        const [allianceConflict, corporationConflict] = await Promise.all([
            Alliances.findOne({ alliance_id: character_id }),
            Corporations.findOne({ corporation_id: character_id }),
        ]);

        if (allianceConflict || corporationConflict) {
            throw new Error(
                `ID conflict: Character ID ${character_id} already exists as an alliance or corporation.`
            );
        }

        // Get existing character from database
        const existingDoc = await Characters.findOne(
            { character_id },
            { _id: 0, __v: 0 }
        );

        // Convert to plain object
        const existingCharacter = existingDoc?.toObject
            ? (existingDoc.toObject() as any)
            : (existingDoc as ICharacter | null);

        // Check if data is fresh enough
        const maxAge = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
        const isDataFresh =
            existingCharacter?.updatedAt &&
            existingCharacter.updatedAt >= maxAge;

        if (existingCharacter && isDataFresh) {
            return existingCharacter;
        }

        // Fetch from ESI
        let esiResponse: any;
        try {
            esiResponse = await this.esi.getCharacter({ character_id });
        } catch (error) {
            // If ESI fails and we have existing data, return it
            if (existingCharacter) {
                cliLogger.warn(
                    `ESI failed for character ${character_id}, returning stale data`
                );
                return existingCharacter;
            }
            throw new Error(
                `Failed to fetch character ${character_id}: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        }

        // Handle ESI errors
        if (!esiResponse?.data) {
            if (existingCharacter) {
                return existingCharacter;
            }
            throw new Error(`No data available for character ${character_id}`);
        }

        const esiData = esiResponse.data;

        // Handle deleted characters or other errors
        if ("error" in esiData) {
            if (esiData.error === "Character has been deleted!") {
                return this.handleDeletedCharacter(
                    character_id,
                    existingCharacter
                );
            }
            throw new Error(
                `ESI Error for character ${character_id}: ${esiData.error}`
            );
        }

        // Build character data from ESI response
        const characterData: ICharacter = {
            character_id,
            name: esiData.name,
            description: esiData.description || "",
            birthday: new Date(esiData.birthday),
            gender: esiData.gender,
            race_id: esiData.race_id,
            security_status: esiData.security_status,
            bloodline_id: esiData.bloodline_id,
            corporation_id: esiData.corporation_id,
            corporation_name: "",
            // Preserve existing data
            history: existingCharacter?.history || [],
            deleted: false,
            last_active: existingCharacter?.last_active,
            title: existingCharacter?.title,
            // Initialize derived fields
            alliance_id: 0,
            alliance_name: "",
            faction_id: 0,
            faction_name: "",
        };

        // Derive alliance and faction info from corporation
        const corporation = await this.corporationService.getCorporation(
            characterData.corporation_id
        );

        // Set corporation name
        characterData.corporation_name = corporation.name || "";

        // IDs can be present on corporation; names are not guaranteed
        characterData.alliance_id = corporation.alliance_id || 0;
        characterData.faction_id = corporation.faction_id || 0;

        // Fetch alliance name separately if needed
        if (characterData.alliance_id && characterData.alliance_id > 0) {
            try {
                const alliance = await this.allianceService.getAlliance(
                    characterData.alliance_id
                );
                characterData.alliance_name = alliance.name || "";
            } catch (e: any) {
                cliLogger.warn(
                    `Failed to fetch alliance ${characterData.alliance_id} for character ${character_id}: ${e.message}`
                );
                characterData.alliance_name = "";
            }
        }

        // Fetch faction name from Factions model if needed
        if (characterData.faction_id && characterData.faction_id > 0) {
            try {
                const faction = await getCachedFaction(
                    characterData.faction_id
                );
                characterData.faction_name = faction?.name || "";
            } catch (e: any) {
                cliLogger.warn(
                    `Failed to resolve faction ${characterData.faction_id} name for character ${character_id}: ${e.message}`
                );
                characterData.faction_name = "";
            }
        }

        // Save to database
        // Check if we need to update history (only if affiliation changed)
        const shouldUpdateHistory = this.shouldUpdateAffiliationHistory(
            existingCharacter,
            characterData
        );
        if (shouldUpdateHistory) {
            try {
                await queueUpdateCharacterHistory(character_id, 2);
                cliLogger.debug(
                    `Queued corporation history update for character ${character_id}`
                );
            } catch (e: any) {
                cliLogger.warn(
                    `Failed to queue history update for character ${character_id}: ${e.message}`
                );
            }
        }

        await this.saveCharacter(characterData);
        return characterData;
    }

    /**
     * Get character history from ESI
     */
    async getCharacterHistory(
        character_id: number
    ): Promise<ICharacterHistory[]> {
        try {
            const response = await this.esi.getCharacterCorporationhistory({
                character_id,
            });
            return response.data.map((entry: any) => ({
                record_id: entry.record_id,
                corporation_id: entry.corporation_id,
                start_date: new Date(entry.start_date),
                is_deleted: entry.is_deleted,
            }));
        } catch (error) {
            cliLogger.error(
                `Failed to fetch character history for ${character_id}: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
            return [];
        }
    }

    /**
     * Check if character affiliation history needs updating
     */
    private shouldUpdateAffiliationHistory(
        existing: ICharacter | null,
        current: ICharacter
    ): boolean {
        if (!existing) return false;

        return (
            existing.corporation_id !== current.corporation_id ||
            existing.alliance_id !== current.alliance_id ||
            !existing.history ||
            existing.history.length === 0
        );
    }

    /**
     * Handle deleted character
     */
    private async handleDeletedCharacter(
        character_id: number,
        existingCharacter: ICharacter | null
    ): Promise<ICharacter> {
        const deletedCharacter: ICharacter = {
            character_id,
            name: existingCharacter?.name || "Deleted Character",
            description:
                existingCharacter?.description ||
                "This character has been deleted",
            birthday: existingCharacter?.birthday || new Date("2003-01-01"),
            gender: existingCharacter?.gender || "Unknown",
            race_id: existingCharacter?.race_id || 0,
            security_status: existingCharacter?.security_status || 0,
            bloodline_id: existingCharacter?.bloodline_id || 0,
            corporation_id: existingCharacter?.corporation_id || 1000001, // NPC corp
            alliance_id: 0,
            faction_id: 0,
            alliance_name: "",
            faction_name: "",
            history: existingCharacter?.history || [],
            deleted: true,
            last_active: existingCharacter?.last_active,
            title: existingCharacter?.title,
        };

        await this.saveCharacter(deletedCharacter);
        return deletedCharacter;
    }

    /**
     * Save character to database
     */
    private async saveCharacter(characterData: ICharacter): Promise<void> {
        try {
            await Characters.updateOne(
                { character_id: characterData.character_id },
                { $set: characterData },
                { upsert: true }
            );
            cliLogger.debug(
                `Saved character ${characterData.character_id} to database`
            );
        } catch (error: any) {
            cliLogger.error(
                `Failed to save character ${characterData.character_id}: ${error.message}`
            );
            throw new Error(
                `Database save failed for character ${characterData.character_id}`
            );
        }
    }

    /**
     * Update character corporation history
     */
    async updateCharacterHistory(character_id: number): Promise<void> {
        try {
            const history = await this.getCharacterHistory(character_id);

            await Characters.updateOne({ character_id }, { $set: { history } });

            cliLogger.debug(
                `Updated corporation history for character ${character_id}`
            );
        } catch (error: any) {
            cliLogger.error(
                `Failed to update history for character ${character_id}: ${error.message}`
            );
            throw error;
        }
    }

    /**
     * Check if character exists (quick check without full data fetch)
     */
    async characterExists(character_id: number): Promise<boolean> {
        try {
            const character = await Characters.findOne(
                { character_id },
                { character_id: 1 }
            );
            return !!character;
        } catch (error: any) {
            cliLogger.error(
                `Error checking if character ${character_id} exists: ${error.message}`
            );
            return false;
        }
    }

    /**
     * Get multiple characters efficiently
     */
    async getCharacters(
        character_ids: number[],
        maxAgeHours: number = 24
    ): Promise<ICharacter[]> {
        const results: ICharacter[] = [];

        for (const character_id of character_ids) {
            try {
                const character = await this.getCharacter(
                    character_id,
                    maxAgeHours
                );
                results.push(character);
            } catch (error: any) {
                cliLogger.warn(
                    `Failed to fetch character ${character_id}: ${error.message}`
                );
                // Continue with other characters instead of failing completely
            }
        }

        return results;
    }
}

// Export singleton pattern
let _characterService: CharacterService | null = null;

export function getCharacterService(): CharacterService {
    if (!_characterService) {
        _characterService = new CharacterService();
    }
    return _characterService;
}
