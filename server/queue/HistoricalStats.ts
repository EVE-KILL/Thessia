import prisma from "~/lib/prisma";
import { cliLogger } from "../helpers/Logger";
import { createQueue } from "../helpers/Queue";

const historicalStatsQueue = createQueue("historicalStats");

function calculateChanges(
    currentCount: number,
    history: Array<{ count: number; date: Date }>
) {
    const getChange = (days: number) => {
        const previous = history.find((entry) => {
            const diff =
                (new Date().getTime() - new Date(entry.date).getTime()) /
                (1000 * 60 * 60 * 24);
            return diff >= days - 0.5 && diff <= days + 0.5;
        });
        return previous ? currentCount - previous.count : 0;
    };

    return {
        change_1d: getChange(1),
        change_7d: getChange(7),
        change_14d: getChange(14),
        change_30d: getChange(30),
    };
}

async function upsertHistoricalStat(
    allianceId: number,
    corporationId: number,
    count: number,
    currentDate: Date
) {
    const existing = await prisma.historicalStats.findFirst({
        where: {
            alliance_id: allianceId,
            corporation_id: corporationId,
            date: currentDate,
        },
    });

    const previous = await prisma.historicalStats.findFirst({
        where: {
            alliance_id: allianceId,
            corporation_id: corporationId,
        },
        orderBy: { date: "desc" },
    });

    const historicalCounts = [
        { count, date: currentDate },
        ...(((previous?.historicalCounts as any[]) || []).slice(0, 29)),
    ];

    const changes = calculateChanges(
        count,
        historicalCounts.slice(1) as Array<{ count: number; date: Date }>
    );

    const data = {
        alliance_id: allianceId,
        corporation_id: corporationId,
        count,
        previousCount: previous?.count || 0,
        date: currentDate,
        historicalCounts,
        ...changes,
    };

    if (existing) {
        await prisma.historicalStats.update({
            where: { id: existing.id },
            data,
        });
    } else {
        await prisma.historicalStats.create({ data });
    }
}

async function processAllianceHistoricalStats(
    allianceId: number,
    memberCount: number,
    currentDate: Date
) {
    cliLogger.info(
        `📊 Processing alliance ${allianceId} historical stats (${memberCount} members)`
    );
    await upsertHistoricalStat(allianceId, 0, memberCount, currentDate);
}

async function processCorporationHistoricalStats(
    corporationId: number,
    memberCount: number,
    currentDate: Date
) {
    cliLogger.info(
        `📊 Processing corporation ${corporationId} historical stats (${memberCount} members)`
    );
    await upsertHistoricalStat(0, corporationId, memberCount, currentDate);
}

async function processHistoricalStats(jobData: {
    entityId: number;
    entityType: "alliance" | "corporation";
    memberCount: number;
    currentDate: Date;
}) {
    const { entityId, entityType, memberCount, currentDate } = jobData;
    if (entityType === "alliance") {
        return await processAllianceHistoricalStats(
            entityId,
            memberCount,
            new Date(currentDate)
        );
    }

    return await processCorporationHistoricalStats(
        entityId,
        memberCount,
        new Date(currentDate)
    );
}

async function queueHistoricalStatsProcessing(
    entityId: number,
    entityType: "alliance" | "corporation",
    memberCount: number,
    currentDate: Date,
    priority = 1
) {
    await historicalStatsQueue.add(
        "historicalStats",
        {
            entityId,
            entityType,
            memberCount,
            currentDate,
        },
        {
            priority,
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 5000,
            },
            removeOnComplete: 10,
            removeOnFail: 25,
        }
    );
}

async function queueHistoricalStatsProcessingBulk(
    entities: Array<{
        entityId: number;
        entityType: "alliance" | "corporation";
        memberCount: number;
    }>,
    currentDate: Date,
    priority = 1
) {
    const jobs = entities.map((entity) => ({
        name: "historicalStats",
        data: {
            entityId: entity.entityId,
            entityType: entity.entityType,
            memberCount: entity.memberCount,
            currentDate,
        },
        opts: {
            priority,
            attempts: 3,
            backoff: {
                type: "exponential" as const,
                delay: 5000,
            },
            removeOnComplete: 10,
            removeOnFail: 25,
        },
    }));

    await historicalStatsQueue.addBulk(jobs);
}

async function hasQueuedJobs(): Promise<boolean> {
    const waiting = await historicalStatsQueue.getWaiting();
    const active = await historicalStatsQueue.getActive();
    const delayed = await historicalStatsQueue.getDelayed();
    return waiting.length + active.length + delayed.length > 0;
}

export {
    queueHistoricalStatsProcessing,
    queueHistoricalStatsProcessingBulk,
    processAllianceHistoricalStats,
    processCorporationHistoricalStats,
    processHistoricalStats,
    hasQueuedJobs,
};
