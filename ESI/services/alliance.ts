import { cliLogger } from "../../server/helpers/Logger";
import { getCachedFaction } from "../../server/helpers/RuntimeCache";
import type { IAlliance } from "../../server/interfaces/IAlliance";
import { Alliances } from "../../server/models/Alliances";
import { Characters } from "../../server/models/Characters";
import { Corporations } from "../../server/models/Corporations";
import { getEsiClient } from "../client";

/**
 * Alliance service with proper caching and data management
 */
export class AllianceService {
    private esi = getEsiClient().esi;

    /**
     * Get alliance data with intelligent caching
     * @param alliance_id Alliance ID to fetch
     * @param maxAgeHours Maximum age in hours before refetching (default: 720 - 30 days)
     */
    async getAlliance(
        alliance_id: number,
        maxAgeHours: number = 720
    ): Promise<IAlliance> {
        // Check for ID conflicts
        const [characterConflict, corporationConflict] = await Promise.all([
            Characters.findOne({ character_id: alliance_id }),
            Corporations.findOne({ corporation_id: alliance_id }),
        ]);

        if (characterConflict || corporationConflict) {
            throw new Error(
                `ID conflict: Alliance ID ${alliance_id} already exists as a character or corporation.`
            );
        }

        // Get existing alliance from database
        const existingDoc = await Alliances.findOne(
            { alliance_id },
            { _id: 0, __v: 0 }
        );

        // Convert to plain object
        const existingAlliance = existingDoc?.toObject
            ? (existingDoc.toObject() as unknown as IAlliance)
            : (existingDoc as unknown as IAlliance | null);

        // Check if data is fresh enough
        const maxAge = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
        const isDataFresh =
            existingAlliance?.updatedAt && existingAlliance.updatedAt >= maxAge;

        if (existingAlliance && isDataFresh) {
            return existingAlliance;
        }

        cliLogger.debug(`Fetching alliance ${alliance_id} from ESI`);

        // Fetch from ESI
        let esiData: any | null = null;
        try {
            const response = await this.esi.getAlliance({ alliance_id });
            esiData = response.data;
        } catch (error: any) {
            // Handle specific ESI errors
            if (error.response?.status === 404) {
                throw new Error(`Alliance ${alliance_id} not found`);
            }
            if (error.response?.status === 403) {
                throw new Error(`Alliance ${alliance_id} is forbidden`);
            }
            throw new Error(
                `Failed to fetch alliance ${alliance_id}: ${error.message}`
            );
        }

        if (!esiData) {
            throw new Error(
                `ESI returned null data for alliance ${alliance_id}`
            );
        }

        // Prepare alliance data
        const allianceData: IAlliance = {
            alliance_id,
            name: esiData.name,
            ticker: esiData.ticker,
            creator_id: esiData.creator_id,
            creator_corporation_id: esiData.creator_corporation_id,
            executor_corporation_id: esiData.executor_corporation_id,
            date_founded: esiData.date_founded
                ? new Date(esiData.date_founded)
                : new Date(),
            faction_id: esiData.faction_id || 0,
            faction_name: "",
        };

        // Handle faction data if present: resolve faction name from DB
        if (allianceData.faction_id && allianceData.faction_id > 0) {
            try {
                const faction = await getCachedFaction(allianceData.faction_id);
                allianceData.faction_name = faction?.name || "";
            } catch (e: any) {
                cliLogger.warn(
                    `Failed to resolve faction ${allianceData.faction_id} name for alliance ${alliance_id}: ${e.message}`
                );
                allianceData.faction_name = "";
            }
        }

        // Save to database
        await this.saveAlliance(allianceData);

        return allianceData;
    }

    /**
     * Save alliance to database with proper error handling
     */
    private async saveAlliance(allianceData: IAlliance): Promise<void> {
        try {
            await Alliances.updateOne(
                { alliance_id: allianceData.alliance_id },
                { $set: allianceData },
                { upsert: true }
            );
            cliLogger.debug(
                `Saved alliance ${allianceData.alliance_id} to database`
            );
        } catch (error: any) {
            cliLogger.error(
                `Failed to save alliance ${allianceData.alliance_id}: ${error.message}`
            );
            throw new Error(
                `Database save failed for alliance ${allianceData.alliance_id}`
            );
        }
    }

    /**
     * Check if alliance exists (quick check without full data fetch)
     */
    async allianceExists(alliance_id: number): Promise<boolean> {
        try {
            const alliance = await Alliances.findOne(
                { alliance_id },
                { alliance_id: 1 }
            );
            return !!alliance;
        } catch (error: any) {
            cliLogger.error(
                `Error checking if alliance ${alliance_id} exists: ${error.message}`
            );
            return false;
        }
    }

    /**
     * Get multiple alliances efficiently
     */
    async getAlliances(
        alliance_ids: number[],
        maxAgeHours: number = 720
    ): Promise<IAlliance[]> {
        const results: IAlliance[] = [];

        for (const alliance_id of alliance_ids) {
            try {
                const alliance = await this.getAlliance(
                    alliance_id,
                    maxAgeHours
                );
                results.push(alliance);
            } catch (error: any) {
                cliLogger.warn(
                    `Failed to fetch alliance ${alliance_id}: ${error.message}`
                );
                // Continue with other alliances instead of failing completely
            }
        }

        return results;
    }
}

// Export singleton instance
let allianceService: AllianceService | null = null;

export function getAllianceService(): AllianceService {
    if (!allianceService) {
        allianceService = new AllianceService();
    }
    return allianceService;
}
