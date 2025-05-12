import { createError, defineEventHandler, readBody } from 'h3';
import { compileFullBattleData } from '~/server/helpers/Battles';
import { Battles } from '~/server/models/Battles';
import { Corporations } from '~/server/models/Corporations';
import { Killmails } from '~/server/models/Killmails';

export default defineEventHandler(async (event) => {
    try {
        const { systemId, startTime, endTime, sideA, sideB } = await readBody(event);

        // Validate required parameters
        if (!systemId) {
            throw createError({ statusCode: 400, statusMessage: 'System ID is required' });
        }
        if (!startTime) {
            throw createError({ statusCode: 400, statusMessage: 'Start time is required' });
        }
        if (!endTime) {
            throw createError({ statusCode: 400, statusMessage: 'End time is required' });
        }
        if (!Array.isArray(sideA) || sideA.length === 0) {
            throw createError({ statusCode: 400, statusMessage: 'Side A must be a non-empty array' });
        }
        if (!Array.isArray(sideB) || sideB.length === 0) {
            throw createError({ statusCode: 400, statusMessage: 'Side B must be a non-empty array' });
        }

        // Convert string dates to Date objects
        const startTimeDate = new Date(startTime);
        const endTimeDate = new Date(endTime);

        // Enforce maximum timespan of 36 hours
        const span = endTimeDate.getTime() - startTimeDate.getTime();
        const maxSpan = 36 * 60 * 60 * 1000; // 36h in ms
        if (span > maxSpan) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Battle timespan cannot exceed 36 hours. Please select a smaller timespan.'
            });
        }

        // Query killmails within the specified system and time range
        const killmails = await Killmails.find({
            system_id: systemId,
            kill_time: {
                $gte: startTimeDate,
                $lte: endTimeDate
            }
        }).lean();

        if (killmails.length === 0) {
            throw createError({
                statusCode: 404,
                statusMessage: 'No killmails found for the specified system and time range'
            });
        }

        // Extract alliance and corporation IDs for each side
        const allianceIdsA = sideA.filter(entity => entity.type === 'alliance').map(entity => entity.id);
        const corpIdsA = sideA.filter(entity => entity.type === 'corporation').map(entity => entity.id);
        const allianceIdsB = sideB.filter(entity => entity.type === 'alliance').map(entity => entity.id);
        const corpIdsB = sideB.filter(entity => entity.type === 'corporation').map(entity => entity.id);

        // Query the Corporations collection to get alliance information
        const corpDocsA = await Corporations.find({ corporation_id: { $in: corpIdsA } }, { corporation_id: 1, alliance_id: 1, name: 1 }).lean();
        const corpDocsB = await Corporations.find({ corporation_id: { $in: corpIdsB } }, { corporation_id: 1, alliance_id: 1, name: 1 }).lean();

        // Filter each side's corporation list to only include those where:
        // - alliance_id is undefined/null OR
        // - alliance_id is not in that side's alliance IDs
        const filteredCorpIdsA = corpDocsA
            .filter(doc => !doc.alliance_id || !allianceIdsA.includes(doc.alliance_id))
            .map(doc => doc.corporation_id);

        const filteredCorpIdsB = corpDocsB
            .filter(doc => !doc.alliance_id || !allianceIdsB.includes(doc.alliance_id))
            .map(doc => doc.corporation_id);

        // Prepare the teams data with filtered corporations
        const blueTeam = {
            alliances: sideA.filter(entity => entity.type === 'alliance').map(entity => ({ id: entity.id, name: entity.name })),
            corporations: sideA
                .filter(entity => entity.type === 'corporation' && filteredCorpIdsA.includes(entity.id))
                .map(entity => ({ id: entity.id, name: entity.name }))
        };

        const redTeam = {
            alliances: sideB.filter(entity => entity.type === 'alliance').map(entity => ({ id: entity.id, name: entity.name })),
            corporations: sideB
                .filter(entity => entity.type === 'corporation' && filteredCorpIdsB.includes(entity.id))
                .map(entity => ({ id: entity.id, name: entity.name }))
        };

        // Create manual teams object
        const manualTeams = {
            blue_team: blueTeam,
            red_team: redTeam
        };

        // Generate a battle document using compileFullBattleData with manual teams
        const battleDocument = await compileFullBattleData(
            killmails,
            systemId,
            startTimeDate,
            endTimeDate,
            undefined,
            manualTeams
        );

        // Mark as custom battle
        battleDocument.custom = true;

        // Save the battle document
        const savedBattle = await Battles.create(battleDocument);

        return savedBattle;
    } catch (error: any) {
        console.error('Error in battles/custom endpoint:', error);
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.statusMessage || 'Internal Server Error'
        });
    }
});
