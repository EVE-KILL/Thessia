import type { Prisma } from "@prisma/client";
import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
    // Authenticate and verify admin privileges
    await requireAdminAuth(event);

    try {
        // Get query parameters for pagination and filtering
        const query = getQuery(event);
        const {
            search = "",
            active = "all",
            sortField = "createdAt",
            order = "desc",
            page = "1",
            limit = "25",
        } = query;

        // Convert query parameters to proper types
        const pageNum = Math.max(1, parseInt(page as string) || 1);
        const limitNum = Math.max(
            1,
            Math.min(100, parseInt(limit as string) || 25)
        );
        const skip = (pageNum - 1) * limitNum;

        // Build Prisma where clause
        const where: Prisma.ApiKeyWhereInput = {};

        // Add search filter
        if (search && typeof search === "string" && search.trim() !== "") {
            where.OR = [
                { name: { contains: search.trim(), mode: "insensitive" } },
                {
                    description: {
                        contains: search.trim(),
                        mode: "insensitive",
                    },
                },
            ];
        }

        // Add active filter
        if (active === "true") {
            where.active = true;
        } else if (active === "false") {
            where.active = false;
        }

        // Build sort options
        const sortMap: Record<string, string> = {
            name: "name",
            createdAt: "created_at",
            lastUsed: "last_used",
            active: "active",
        };
        const sortKey = sortMap[sortField as string] || "created_at";
        const orderBy: Prisma.ApiKeyOrderByWithRelationInput = {
            [sortKey]:
                order === "asc" || order === "ASC" ? "asc" : ("desc" as const),
        };

        // Execute queries
        const [apiKeys, totalCount] = await Promise.all([
            prisma.apiKey.findMany({
                where,
                orderBy,
                skip,
                take: limitNum,
                select: {
                    id: true,
                    name: true,
                    description: true,
                    active: true,
                    last_used: true,
                    created_at: true,
                    created_by: true,
                },
            }),
            prisma.apiKey.count({ where }),
        ]);

        // Get creator character names from Users
        const creatorIds = [
            ...new Set(
                apiKeys
                    .map((key) => key.created_by)
                    .filter((id): id is number => id !== null)
            ),
        ];
        const creators =
            creatorIds.length > 0
                ? await prisma.user.findMany({
                      where: { id: { in: creatorIds } },
                      select: {
                          id: true,
                          character_id: true,
                          character_name: true,
                      },
                  })
                : [];

        const creatorMap = new Map(
            creators.map((c) => [c.id, c.character_name])
        );

        // Enhance api keys with creator names
        const enhancedApiKeys = apiKeys.map((key) => ({
            ...key,
            createdByName:
                creatorMap.get(Number(key.created_by)) ||
                creatorMap.get(Number(key.created_by)) ||
                "Unknown",
        }));

        return {
            success: true,
            data: enhancedApiKeys,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitNum),
                hasNext: pageNum < Math.ceil(totalCount / limitNum),
                hasPrev: pageNum > 1,
            },
        };
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to fetch API keys",
        });
    }
});
