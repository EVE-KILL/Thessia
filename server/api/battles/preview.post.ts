import { createError, defineEventHandler, readBody } from 'h3';
import { compileFullBattleData } from '~/server/helpers/Battles';
import { Corporations } from '~/server/models/Corporations';
import { Killmails } from '~/server/models/Killmails';
import { Regions } from '~/server/models/Regions';
import { SolarSystems } from '~/server/models/SolarSystems';

interface Side {
    side_id: string;
    name: string;
    entities: Array<{
        id: number;
        type: 'alliance' | 'corporation';
    }>;
}

export default defineEventHandler(async (event) => {
    try {
        const { systems, sides, startTime, endTime } = await readBody(event);

        // Validate required parameters
        if (!systems || !Array.isArray(systems) || systems.length === 0) {
            throw createError({ statusCode: 400, statusMessage: 'apiErrors.customBattles.preview.systemRequired' });
        }

        // Enforce maximum system limit
        if (systems.length > 5) {
            throw createError({ statusCode: 400, statusMessage: 'apiErrors.customBattles.preview.maxSystems' });
        }

        if (!startTime) {
            throw createError({ statusCode: 400, statusMessage: 'apiErrors.customBattles.preview.startTimeRequired' });
        }
        if (!endTime) {
            throw createError({ statusCode: 400, statusMessage: 'apiErrors.customBattles.preview.endTimeRequired' });
        }
        if (!sides || !Array.isArray(sides) || sides.length < 2) {
            throw createError({ statusCode: 400, statusMessage: 'apiErrors.customBattles.preview.minSides' });
        }
        if (sides.length > 4) {
            throw createError({ statusCode: 400, statusMessage: 'apiErrors.customBattles.preview.maxSides' });
        }

        // Convert string dates to Date objects
        const startTimeDate = new Date(startTime);
        const endTimeDate = new Date(endTime);

        // Get system IDs array
        const systemIds = systems.map(system => system.system_id);

        // Check if the timespan is within the allowed limit (36 hours)
        const timeDiffMs = endTimeDate.getTime() - startTimeDate.getTime();
        const maxTimespan = 36 * 60 * 60 * 1000; // 36 hours in milliseconds

        if (timeDiffMs > maxTimespan) {
            throw createError({
                statusCode: 400,
                statusMessage: 'apiErrors.customBattles.preview.maxTimespan'
            });
        }

        // Query killmails within all specified systems and time range
        const killmails = await Killmails.find({
            system_id: { $in: systemIds },
            kill_time: {
                $gte: startTimeDate,
                $lte: endTimeDate
            }
        }).lean();

        if (killmails.length === 0) {
            throw createError({
                statusCode: 404,
                statusMessage: 'apiErrors.customBattles.preview.noKillmails'
            });
        }

        // Process systems data properly for the preview endpoint
        const systemsData = await Promise.all(systems.map(async (system) => {
            const systemInfo = await SolarSystems.findOne(
                { system_id: system.system_id },
                { system_name: 1, region_id: 1, security: 1 }
            ).lean();

            const regionInfo = systemInfo?.region_id ?
                await Regions.findOne({ region_id: systemInfo.region_id }, { name: 1 }).lean() :
                null;

            return {
                system_id: system.system_id,
                system_name: systemInfo?.system_name || "Unknown System",
                system_security: systemInfo?.security || 0,
                region_id: systemInfo?.region_id || 0,
                region_name: regionInfo?.name || { en: "Unknown Region" }
            };
        }));

        // Prepare teams structure
        // First, extract all alliance and corporation IDs for each side
        const teamsData = await prepareTeamsData(sides);

        // Use the first system ID for the battle ID generation
        // (compatible with existing battle ID generation logic)
        const primarySystemId = systemIds[0];

        // Generate a battle document using compileFullBattleData with dynamic teams
        const battleDocument = await compileFullBattleData(
            killmails,
            systemIds, // still pass systemIds array for internal processing
            startTimeDate,
            endTimeDate,
            undefined,
            teamsData
        );

        // Mark as custom battle
        battleDocument.custom = true;

        // Return the battle document without saving it
        return battleDocument;
    } catch (error: any) {
        console.error('Error in customBattles/preview endpoint:', error);
        // If statusMessage is already a key (e.g. from a previous createError), use it.
        // Otherwise, use the generic internal server error key.
        const messageIsKey = typeof error.statusMessage === 'string' && error.statusMessage.startsWith('apiErrors.');
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: messageIsKey ? error.statusMessage : 'apiErrors.customBattles.preview.internalServerError'
        });
    }
});

/**
 * Process sides data to prepare teams structure for compileFullBattleData
 */
async function prepareTeamsData(sides: Side[]) {
    const teamsData: Record<string, { alliances: any[], corporations: any[] }> = {};

    for (const side of sides) {
        const allianceIds = side.entities.filter(e => e.type === 'alliance').map(e => e.id);
        let corpIds = side.entities.filter(e => e.type === 'corporation').map(e => e.id);

        // Query corporations to get alliance relationships
        const corpDocs = await Corporations.find(
            { corporation_id: { $in: corpIds } },
            { corporation_id: 1, alliance_id: 1, name: 1 }
        ).lean();

        // Filter out corporations that belong to alliances already in this side
        // (they'll be included implicitly with their alliance)
        const filteredCorpIds = corpDocs
            .filter(doc => !doc.alliance_id || !allianceIds.includes(doc.alliance_id))
            .map(doc => doc.corporation_id);

        // Prepare the team data structure
        teamsData[side.side_id] = {
            name: side.name,
            alliances: allianceIds.map(id => ({ id })),
            corporations: filteredCorpIds.map(id => ({ id })),
        };
    }

    return teamsData;
}
