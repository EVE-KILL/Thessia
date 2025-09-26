import { cliLogger } from "../server/helpers/Logger";
import { InvTypes } from "../server/models/InvTypes";

export default {
    name: "exportShipTypeIds",
    description: "Export ship type IDs for T1, T2, T3, and faction ships",
    run: async () => {
        cliLogger.info("🚀 Starting ship type ID export...");

        try {
            // Define queries for each ship type
            const shipTypeQueries = {
                t1: { "dogma_attributes.422.value": 1, category_id: 6 },
                t2: { "dogma_attributes.422.value": 2, category_id: 6 },
                t3: { "dogma_attributes.422.value": 3, category_id: 6 },
                faction: {
                    $or: [
                        { meta_group_id: 4, category_id: 6 },
                        { "dogma_attributes.1692.value": 4, category_id: 6 },
                    ],
                },
            };

            const result: Record<string, number[]> = {};

            // First, fetch all faction ships to know what to exclude
            cliLogger.info(
                `📋 Fetching faction ship type IDs for deduplication...`
            );
            const factionShipTypes = await InvTypes.find(
                shipTypeQueries.faction,
                { type_id: 1 }
            ).lean();
            const factionShipIds = new Set(
                factionShipTypes.map((ship: any) => ship.type_id)
            );
            cliLogger.info(
                `✅ Found ${factionShipIds.size} faction ships to use for deduplication`
            );

            // Now fetch T1, T2, T3 ships and remove any that are faction ships
            for (const type of ["t1", "t2", "t3"]) {
                const query =
                    shipTypeQueries[type as keyof typeof shipTypeQueries];
                cliLogger.info(`📋 Fetching ${type} ship type IDs...`);

                const shipTypes = await InvTypes.find(query, {
                    type_id: 1,
                }).lean();
                const allTypeIds = shipTypes.map((ship: any) => ship.type_id);

                // Remove any ships that are also faction ships
                const uniqueTypeIds = allTypeIds
                    .filter((id) => !factionShipIds.has(id))
                    .sort((a: number, b: number) => a - b);

                result[type] = uniqueTypeIds;

                cliLogger.info(
                    `✅ Found ${allTypeIds.length} total ${type} ships, ${uniqueTypeIds.length} unique after removing faction ships`
                );
            }

            // Add faction ships (all of them, no deduplication needed since we deduplicated the others)
            const sortedFactionIds = Array.from(factionShipIds).sort(
                (a: number, b: number) => a - b
            );
            result.faction = sortedFactionIds;
            cliLogger.info(`✅ Added ${sortedFactionIds.length} faction ships`);

            // Output the JSON
            console.log(JSON.stringify(result, null, 2));

            cliLogger.info("✅ Ship type ID export completed successfully");
        } catch (error) {
            cliLogger.error(`❌ Error exporting ship type IDs: ${error}`);
            process.exit(1);
        }
    },
};
