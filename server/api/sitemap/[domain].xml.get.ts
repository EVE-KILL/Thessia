import { CustomDomainService } from "~/server/services";

/**
 * Dynamic sitemap generation for custom domains
 * Generates XML sitemaps with domain-specific URLs and content
 */
export default defineEventHandler(async (event) => {
    const domain = getRouterParam(event, "domain");

    if (!domain) {
        throw createError({
            statusCode: 400,
            statusMessage: "Domain parameter required",
        });
    }

    try {
        // Find the custom domain configuration
        const domainConfig = await CustomDomainService.findActiveDomain(
            domain.toLowerCase()
        );

        if (!domainConfig) {
            throw createError({
                statusCode: 404,
                statusMessage: "Domain not found or not active",
            });
        }

        // Get entity information
        let entityInfo = null;
        switch (domainConfig.entity_type) {
            case "character":
                entityInfo = await Characters.findOne(
                    {
                        character_id: domainConfig.entity_id,
                    },
                    { name: 1, character_id: 1 }
                );
                break;
            case "corporation":
                entityInfo = await Corporations.findOne(
                    {
                        corporation_id: domainConfig.entity_id,
                    },
                    { name: 1, ticker: 1, corporation_id: 1 }
                );
                break;
            case "alliance":
                entityInfo = await Alliances.findOne(
                    {
                        alliance_id: domainConfig.entity_id,
                    },
                    { name: 1, ticker: 1, alliance_id: 1 }
                );
                break;
        }

        if (!entityInfo) {
            throw createError({
                statusCode: 404,
                statusMessage: "Entity not found",
            });
        }

        const baseUrl = `https://${domain}`;
        const currentDate = new Date().toISOString();

        // Build sitemap URLs
        const urls: Array<{
            loc: string;
            lastmod?: string;
            changefreq?: string;
            priority?: string;
        }> = [];

        // Main pages
        urls.push({
            loc: baseUrl,
            lastmod: currentDate,
            changefreq: "daily",
            priority: "1.0",
        });

        // Entity-specific pages based on default page and available data
        const entityPages = [
            { path: "/kills", priority: "0.9", changefreq: "hourly" },
            { path: "/losses", priority: "0.9", changefreq: "hourly" },
            { path: "/combined", priority: "0.8", changefreq: "daily" },
            { path: "/stats", priority: "0.7", changefreq: "weekly" },
        ];

        // Add corporation/alliance specific pages
        if (domainConfig.entity_type === "corporation") {
            entityPages.push({
                path: "/members",
                priority: "0.6",
                changefreq: "daily",
            });
        } else if (domainConfig.entity_type === "alliance") {
            entityPages.push(
                { path: "/corporations", priority: "0.6", changefreq: "daily" },
                { path: "/members", priority: "0.6", changefreq: "daily" }
            );
        }

        // Add entity pages to sitemap
        for (const page of entityPages) {
            urls.push({
                loc: `${baseUrl}${page.path}`,
                lastmod: currentDate,
                changefreq: page.changefreq as any,
                priority: page.priority,
            });
        }

        // Add recent killmails (limit to most recent 100 for performance)
        const recentKillmails = await getEntityRecentKillmails(
            domainConfig.entity_type,
            domainConfig.entity_id,
            100
        );

        for (const killmail of recentKillmails) {
            urls.push({
                loc: `${baseUrl}/kill/${killmail.killmail_id}`,
                lastmod: killmail.killmail_time
                    ? new Date(killmail.killmail_time).toISOString()
                    : currentDate,
                changefreq: "monthly",
                priority: "0.5",
            });
        }

        // Add campaigns if enabled
        if (domainConfig.public_campaigns) {
            const campaigns = await getCampaignsForEntity(
                domainConfig.entity_type,
                domainConfig.entity_id
            );

            for (const campaign of campaigns) {
                urls.push({
                    loc: `${baseUrl}/campaign/${campaign._id}`,
                    lastmod: campaign.updatedAt
                        ? new Date(campaign.updatedAt).toISOString()
                        : currentDate,
                    changefreq: "weekly",
                    priority: "0.4",
                });
            }
        }

        // Generate XML
        const sitemap = generateSitemapXml(urls);

        // Set appropriate headers
        setResponseHeaders(event, {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        });

        return sitemap;
    } catch (error) {
        console.error("Error generating sitemap for domain:", domain, error);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to generate sitemap",
        });
    }
});

/**
 * Get recent killmails for an entity
 */
async function getEntityRecentKillmails(
    entityType: string,
    entityId: number,
    limit: number = 100
) {
    const matchStage: any = {};

    switch (entityType) {
        case "character":
            matchStage.$or = [
                { "victim.character_id": entityId },
                { "attackers.character_id": entityId },
            ];
            break;
        case "corporation":
            matchStage.$or = [
                { "victim.corporation_id": entityId },
                { "attackers.corporation_id": entityId },
            ];
            break;
        case "alliance":
            matchStage.$or = [
                { "victim.alliance_id": entityId },
                { "attackers.alliance_id": entityId },
            ];
            break;
    }

    return await Killmails.find(matchStage)
        .sort({ killmail_date: -1 })
        .limit(limit)
        .select({ killmail_id: 1, killmail_date: 1 })
        .lean();
}

/**
 * Get campaigns for an entity
 */
async function getCampaignsForEntity(entityType: string, entityId: number) {
    return await Campaigns.find({
        "entity_participants.entity_type": entityType,
        "entity_participants.entity_id": entityId,
        published: true,
    })
        .sort({ updated_at: -1 })
        .select({ _id: 1, updated_at: 1 })
        .lean();
}

/**
 * Generate XML sitemap from URL array
 */
function generateSitemapXml(
    urls: Array<{
        loc: string;
        lastmod?: string;
        changefreq?: string;
        priority?: string;
    }>
) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const url of urls) {
        xml += "  <url>\n";
        xml += `    <loc>${escapeXml(url.loc)}</loc>\n`;

        if (url.lastmod) {
            xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
        }

        if (url.changefreq) {
            xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
        }

        if (url.priority) {
            xml += `    <priority>${url.priority}</priority>\n`;
        }

        xml += "  </url>\n";
    }

    xml += "</urlset>";
    return xml;
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case "<":
                return "&lt;";
            case ">":
                return "&gt;";
            case "&":
                return "&amp;";
            case "'":
                return "&apos;";
            case '"':
                return "&quot;";
            default:
                return c;
        }
    });
}
