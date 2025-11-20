import prisma from "~/lib/prisma";
import { requireAdminAuth } from "~/server/utils/adminAuth";

export default defineEventHandler(async (event) => {
    // Authenticate and verify admin privileges
    await requireAdminAuth(event);

    const query = getQuery(event);
    const page = parseInt(String(query.page || "1"), 10);
    const limit = Math.min(parseInt(String(query.limit || "50"), 10), 250);
    const status = (query.status as string) || "all";
    const search = (query.search as string) || "";

    const where: any = {};
    if (status === "success") {
        where.esi_active = true;
    } else if (status === "error") {
        where.esi_active = false;
    }

    if (search) {
        const maybeId = Number(search);
        where.OR = [
            { character_name: { contains: search, mode: "insensitive" } },
            Number.isFinite(maybeId) ? { character_id: maybeId } : undefined,
        ].filter(Boolean);
    }

    const [totalUsers, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
            where,
            orderBy: { last_checked: "desc" },
            skip: (page - 1) * limit,
            take: limit,
            select: {
                character_id: true,
                character_name: true,
                last_checked: true,
                date_expiration: true,
                esi_active: true,
                can_fetch_corporation_killmails: true,
                scopes: true,
            },
        }),
    ]);

    const activeUsers = await prisma.user.count({
        where: { ...where, esi_active: true },
    });
    const deactivatedUsers = await prisma.user.count({
        where: { ...where, esi_active: false },
    });

    const logs = users.map((user) => ({
        dataType: "tokens",
        source: "esi",
        characterId: user.character_id,
        characterName: user.character_name,
        timestamp: user.last_checked,
        error: user.esi_active === false,
        itemsReturned: Array.isArray(user.scopes) ? user.scopes.length : 0,
        newItemsCount: 0,
        expiresAt: user.date_expiration,
        canFetchCorporationKillmails: user.can_fetch_corporation_killmails,
    }));

    const pages = Math.ceil(totalUsers / limit);
    const totalItemsFetched = logs.reduce(
        (acc, log) => acc + (log.itemsReturned || 0),
        0
    );

    return {
        success: true,
        data: {
            logs,
            pagination: {
                total: totalUsers,
                pages,
                page,
                limit,
                hasNext: page < pages,
                hasPrev: page > 1,
            },
            filters: {
                dataTypes: ["tokens"],
                sources: ["esi"],
            },
            summary: {
                totalRequests: totalUsers,
                successfulRequests: activeUsers,
                errorRequests: deactivatedUsers,
                uniqueCharacters: totalUsers,
                totalItemsFetched,
                totalNewItems: 0,
                successRate:
                    totalUsers === 0
                        ? 0
                        : Math.round((activeUsers / totalUsers) * 100),
                newItemsRate: 0,
                totalUsers,
                activeUsers,
                deactivatedUsers,
            },
            topDataTypes: [
                {
                    dataType: "tokens",
                    count: totalUsers,
                    successCount: activeUsers,
                    errorCount: deactivatedUsers,
                    successRate:
                        totalUsers === 0
                            ? 0
                            : Math.round((activeUsers / totalUsers) * 100),
                },
            ],
            dateRange: {
                startDate: new Date().toISOString(),
                endDate: new Date().toISOString(),
            },
        },
    };
});
