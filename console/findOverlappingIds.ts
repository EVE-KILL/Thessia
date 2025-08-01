import { cliLogger } from "../server/helpers/Logger";
import { Alliances } from "../server/models/Alliances";
import { Characters } from "../server/models/Characters";
import { Corporations } from "../server/models/Corporations";

export default {
    name: "check:overlapping-ids",
    description:
        "Checks for overlapping IDs between Alliances/Corporations and Characters collections",
    longRunning: false,
    run: async () => {
        cliLogger.info(
            "Starting overlap check for Alliance/Corporation IDs in Characters collection..."
        );
        const startTime = Date.now();
        let overlappingAllianceIdsCount = 0;
        let overlappingCorporationIdsCount = 0;

        try {
            // Fetch all alliance_ids from Alliances
            const alliances = await Alliances.find({}, "alliance_id").lean();
            cliLogger.info(`Fetched ${alliances.length} alliances.`);

            // Fetch all corporation_ids from Corporations
            const corporations = await Corporations.find(
                {},
                "corporation_id"
            ).lean();
            cliLogger.info(`Fetched ${corporations.length} corporations.`);

            // Alliance ID Check
            cliLogger.info(
                "Checking Alliance IDs against Characters collection..."
            );
            for (const alliance of alliances) {
                const allianceId = alliance.alliance_id; // Assuming alliance_id is the field in Alliances model
                if (!allianceId) continue; // Skip if alliance_id is not present
                const characterWithAllianceId = await Characters.findOne({
                    character_id: allianceId,
                }).lean();
                if (characterWithAllianceId) {
                    cliLogger.warn(
                        `Found overlapping Alliance ID ${allianceId} in Characters collection (Character ID: ${characterWithAllianceId._id}).`
                    );
                    await Characters.deleteOne({
                        _id: characterWithAllianceId._id,
                    });
                    overlappingAllianceIdsCount++;
                }
            }

            // Corporation ID Check
            cliLogger.info(
                "Checking Corporation IDs against Characters collection..."
            );
            for (const corporation of corporations) {
                const corporationId = corporation.corporation_id; // Assuming corporation_id is the field in Corporations model
                if (!corporationId) continue; // Skip if corporation_id is not present
                const characterWithCorporationId = await Characters.findOne({
                    character_id: corporationId,
                }).lean();
                if (characterWithCorporationId) {
                    cliLogger.warn(
                        `Found overlapping Corporation ID ${corporationId} in Characters collection (Character ID: ${characterWithCorporationId._id}).`
                    );
                    await Characters.deleteOne({
                        _id: characterWithCorporationId._id,
                    });
                    overlappingCorporationIdsCount++;
                }
            }

            const duration = (Date.now() - startTime) / 1000;
            cliLogger.info(
                `Overlap check complete in ${duration.toFixed(
                    2
                )} seconds. Found ${overlappingAllianceIdsCount} overlapping Alliance IDs and ${overlappingCorporationIdsCount} overlapping Corporation IDs.`
            );
            return {
                result: {
                    overlappingAllianceIds: overlappingAllianceIdsCount,
                    overlappingCorporationIds: overlappingCorporationIdsCount,
                },
            };
        } catch (error: any) {
            cliLogger.error(`Error during overlap check: ${error.message}`);
            if (error.stack) {
                cliLogger.error(error.stack);
            }
            return { error: error.message };
        }
    },
};
