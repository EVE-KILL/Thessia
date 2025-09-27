import { cliLogger } from "../../server/helpers/Logger";
import { getCachedFaction } from "../../server/helpers/RuntimeCache";
import type { ICorporation } from "../../server/interfaces/ICorporation";
import { Alliances } from "../../server/models/Alliances";
import { Characters } from "../../server/models/Characters";
import { Corporations } from "../../server/models/Corporations";
import { queueUpdateCorporationHistory } from "../../server/queue/Corporation";
import { getEsiClient } from "../client";
import { getAllianceService } from "./alliance";

/**
 * Corporation service with proper caching and data management
 */
export class CorporationService {
    private esi = getEsiClient().esi;
    private allianceService = getAllianceService();

    /**
     * Get corporation data with intelligent caching
     * @param corporation_id Corporation ID to fetch
     * @param maxAgeHours Maximum age in hours before refetching (default: 168 - 7 days)
     */
    async getCorporation(
        corporation_id: number,
        maxAgeHours: number = 168
    ): Promise<ICorporation> {
        // Check for ID conflicts
        const [characterConflict, allianceConflict] = await Promise.all([
            Characters.findOne({ character_id: corporation_id }),
            Alliances.findOne({ alliance_id: corporation_id }),
        ]);

        if (characterConflict || allianceConflict) {
            throw new Error(
                `ID conflict: Corporation ID ${corporation_id} already exists as a character or alliance.`
            );
        }

        // Get existing corporation from database
        const existingDoc = await Corporations.findOne(
            { corporation_id },
            { _id: 0, __v: 0 }
        );

        // Convert to plain object
        const existingCorporation = existingDoc?.toObject
            ? (existingDoc.toObject() as any)
            : (existingDoc as ICorporation | null);

        // Check if data is fresh enough
        const maxAge = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
        const isDataFresh =
            existingCorporation?.updatedAt &&
            existingCorporation.updatedAt >= maxAge;

        if (existingCorporation && isDataFresh) {
            return existingCorporation;
        }

        cliLogger.debug(`Fetching corporation ${corporation_id} from ESI`);

        // Fetch from ESI
        let esiData: any | null = null;
        try {
            const response = await this.esi.getCorporation({ corporation_id });
            esiData = response.data;
        } catch (error: any) {
            // Handle specific ESI errors
            if (error.response?.status === 404) {
                throw new Error(`Corporation ${corporation_id} not found`);
            }
            if (error.response?.status === 403) {
                throw new Error(`Corporation ${corporation_id} is forbidden`);
            }
            throw new Error(
                `Failed to fetch corporation ${corporation_id}: ${error.message}`
            );
        }

        if (!esiData) {
            throw new Error(
                `ESI returned null data for corporation ${corporation_id}`
            );
        }

        // Prepare corporation data
        const corporationData: ICorporation = {
            corporation_id,
            name: esiData.name,
            ticker: esiData.ticker,
            member_count: esiData.member_count || 0,
            description: esiData.description || "",
            date_founded: esiData.date_founded
                ? new Date(esiData.date_founded)
                : new Date(),
            creator_id: esiData.creator_id || 0,
            ceo_id: esiData.ceo_id || 0,
            home_station_id: esiData.home_station_id || 0,
            home_station_name: "",
            shares: esiData.shares || 0,
            tax_rate: esiData.tax_rate || 0,
            url: esiData.url || "",
            alliance_id: esiData.alliance_id || 0,
            alliance_name: "",
            faction_id: esiData.faction_id || 0,
            faction_name: "",
            history: existingCorporation?.history || [],
        };

        // Fetch alliance data if corporation belongs to one
        if (corporationData.alliance_id && corporationData.alliance_id > 0) {
            try {
                const alliance = await this.allianceService.getAlliance(
                    corporationData.alliance_id
                );
                corporationData.alliance_name = alliance.name;

                // Inherit faction from alliance if corporation doesn't have one
                if (!corporationData.faction_id && alliance.faction_id) {
                    corporationData.faction_id = alliance.faction_id;
                    corporationData.faction_name = alliance.faction_name || "";
                }
            } catch (error: any) {
                cliLogger.warn(
                    `Failed to fetch alliance ${corporationData.alliance_id} for corporation ${corporation_id}: ${error.message}`
                );
                // Continue without alliance data
            }
        }

        // Handle faction data if present (and not inherited from alliance) - resolve name from DB
        if (
            corporationData.faction_id &&
            corporationData.faction_id > 0 &&
            !corporationData.faction_name
        ) {
            try {
                const faction = await getCachedFaction(
                    corporationData.faction_id
                );
                corporationData.faction_name = faction?.name || "";
            } catch (e: any) {
                cliLogger.warn(
                    `Failed to resolve faction ${corporationData.faction_id} name for corporation ${corporation_id}: ${e.message}`
                );
                corporationData.faction_name = "";
            }
        }

        // Check if we need to update alliance history
        const shouldUpdateHistory = this.shouldUpdateAllianceHistory(
            existingCorporation,
            corporationData
        );
        if (shouldUpdateHistory) {
            try {
                await queueUpdateCorporationHistory(corporation_id, 2);
                cliLogger.debug(
                    `Queued alliance history update for corporation ${corporation_id}`
                );
            } catch (e: any) {
                cliLogger.warn(
                    `Failed to queue alliance history update for corporation ${corporation_id}: ${e.message}`
                );
            }
        }

        // Save to database
        await this.saveCorporation(corporationData);

        return corporationData;
    }

    /**
     * Check if alliance history needs updating
     */
    private shouldUpdateAllianceHistory(
        existing: ICorporation | null,
        current: ICorporation
    ): boolean {
        if (!existing) return false;

        // Check if alliance status changed
        return (
            existing.alliance_id !== current.alliance_id ||
            (existing.history && existing.history.length === 0) ||
            !existing.history
        );
    }

    /**
     * Save corporation to database with proper error handling
     */
    private async saveCorporation(
        corporationData: ICorporation
    ): Promise<void> {
        try {
            await Corporations.updateOne(
                { corporation_id: corporationData.corporation_id },
                { $set: corporationData },
                { upsert: true }
            );
            cliLogger.debug(
                `Saved corporation ${corporationData.corporation_id} to database`
            );
        } catch (error: any) {
            cliLogger.error(
                `Failed to save corporation ${corporationData.corporation_id}: ${error.message}`
            );
            throw new Error(
                `Database save failed for corporation ${corporationData.corporation_id}`
            );
        }
    }

    /**
     * Check if corporation exists (quick check without full data fetch)
     */
    async corporationExists(corporation_id: number): Promise<boolean> {
        try {
            const corporation = await Corporations.findOne(
                { corporation_id },
                { corporation_id: 1 }
            );
            return !!corporation;
        } catch (error: any) {
            cliLogger.error(
                `Error checking if corporation ${corporation_id} exists: ${error.message}`
            );
            return false;
        }
    }

    /**
     * Get multiple corporations efficiently
     */
    async getCorporations(
        corporation_ids: number[],
        maxAgeHours: number = 168
    ): Promise<ICorporation[]> {
        const results: ICorporation[] = [];

        for (const corporation_id of corporation_ids) {
            try {
                const corporation = await this.getCorporation(
                    corporation_id,
                    maxAgeHours
                );
                results.push(corporation);
            } catch (error: any) {
                cliLogger.warn(
                    `Failed to fetch corporation ${corporation_id}: ${error.message}`
                );
                // Continue with other corporations instead of failing completely
            }
        }

        return results;
    }

    /**
     * Get corporation history from ESI
     */
    async getCorporationHistory(corporation_id: number): Promise<any[]> {
        try {
            const response = await this.esi.getCorporationAlliancehistory({
                corporation_id,
            });
            return response.data || [];
        } catch (error: any) {
            cliLogger.error(
                `Failed to fetch corporation history for ${corporation_id}: ${error.message}`
            );
            return [];
        }
    }

    /**
     * Update corporation alliance history
     */
    async updateCorporationHistory(corporation_id: number): Promise<void> {
        try {
            const history = await this.getCorporationHistory(corporation_id);

            await Corporations.updateOne(
                { corporation_id },
                { $set: { history } }
            );

            cliLogger.debug(
                `Updated alliance history for corporation ${corporation_id}`
            );
        } catch (error: any) {
            cliLogger.error(
                `Failed to update history for corporation ${corporation_id}: ${error.message}`
            );
            throw error;
        }
    }
}

// Export singleton instance
let corporationService: CorporationService | null = null;

export function getCorporationService(): CorporationService {
    if (!corporationService) {
        corporationService = new CorporationService();
    }
    return corporationService;
}
