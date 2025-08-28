/**
 * Open Graph image generation for custom domains
 * Generates dynamic OG images with domain-specific branding
 */
export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const { type, id, domain, color, logo } = query;

    if (!type || !id) {
        throw createError({
            statusCode: 400,
            statusMessage: "Type and ID parameters required",
        });
    }

    try {
        let entityData = null;
        let domainData = null;

        // Get domain data if provided
        if (domain) {
            domainData = await CustomDomains.findOne({
                domain: domain as string,
                active: true,
                verified: true,
            });
        }

        // Get entity data based on type
        switch (type) {
            case "entity":
                entityData = await getEntityData(
                    id as string,
                    domainData?.entity_type
                );
                break;
            case "killmail":
                entityData = await getKillmailData(id as string);
                break;
            default:
                throw createError({
                    statusCode: 400,
                    statusMessage: "Invalid type parameter",
                });
        }

        if (!entityData) {
            throw createError({
                statusCode: 404,
                statusMessage: "Entity not found",
            });
        }

        // Generate SVG-based OG image
        const ogImage = generateOgImageSvg({
            entityData,
            domainData,
            type: type as string,
            customColor: color as string,
            customLogo: logo as string,
        });

        // Set appropriate headers
        setResponseHeaders(event, {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "public, max-age=86400", // Cache for 24 hours
        });

        return ogImage;
    } catch (error) {
        console.error("Error generating OG image:", error);

        // Return a fallback SVG image
        const fallbackSvg = generateFallbackOgImage();

        setResponseHeaders(event, {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "public, max-age=3600",
        });

        return fallbackSvg;
    }
});

/**
 * Get entity data based on type and ID
 */
async function getEntityData(id: string, entityType?: string) {
    const numericId = parseInt(id);
    if (isNaN(numericId)) return null;

    switch (entityType) {
        case "character":
            return await Characters.findOne({ character_id: numericId }).select(
                "name character_id corporation_id alliance_id"
            );
        case "corporation":
            return await Corporations.findOne({
                corporation_id: numericId,
            }).select("name ticker corporation_id alliance_id member_count");
        case "alliance":
            return await Alliances.findOne({ alliance_id: numericId }).select(
                "name ticker alliance_id corporation_count member_count"
            );
        default:
            // Try to find in all collections
            return (
                (await Characters.findOne({ character_id: numericId }).select(
                    "name character_id corporation_id alliance_id"
                )) ||
                (await Corporations.findOne({
                    corporation_id: numericId,
                }).select(
                    "name ticker corporation_id alliance_id member_count"
                )) ||
                (await Alliances.findOne({ alliance_id: numericId }).select(
                    "name ticker alliance_id corporation_count member_count"
                ))
            );
    }
}

/**
 * Get killmail data
 */
async function getKillmailData(id: string) {
    const numericId = parseInt(id);
    if (isNaN(numericId)) return null;

    return await Killmails.findOne({ killmail_id: numericId }).select(
        "killmail_id victim ship_type_id system_id killmail_date total_value"
    );
}

/**
 * Generate SVG-based OG image
 */
function generateOgImageSvg(options: {
    entityData: any;
    domainData: any;
    type: string;
    customColor?: string;
    customLogo?: string;
}) {
    const { entityData, domainData, type, customColor, customLogo } = options;

    // Colors
    const primaryColor =
        customColor || domainData?.branding?.primary_color || "#3b82f6";
    const backgroundColor = "#1a1a1a";
    const textColor = "#ffffff";
    const accentColor = "#6b7280";

    // Dimensions
    const width = 1200;
    const height = 630;

    let title = "EVE-KILL";
    let subtitle = "EVE Online Killboard";
    let entityName = "";

    if (type === "entity" && entityData) {
        entityName = entityData.name || "Unknown";
        title = entityName;

        if (entityData.character_id) {
            subtitle = "Character Killboard";
        } else if (entityData.corporation_id) {
            subtitle = `Corporation Killboard${
                entityData.ticker ? ` [${entityData.ticker}]` : ""
            }`;
        } else if (entityData.alliance_id) {
            subtitle = `Alliance Killboard${
                entityData.ticker ? ` <${entityData.ticker}>` : ""
            }`;
        }
    } else if (type === "killmail" && entityData) {
        title = `Killmail ${entityData.killmail_id}`;
        subtitle = `${entityData.victim?.ship_type_name || "Ship"} destroyed`;
        if (entityData.total_value) {
            subtitle += ` - ${formatISK(entityData.total_value)}`;
        }
    }

    // Domain branding
    if (domainData?.branding?.header_title) {
        subtitle += ` - ${domainData.branding.header_title}`;
    }

    const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${backgroundColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${primaryColor};stop-opacity:0.3" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" fill="url(#bg)"/>

  <!-- Accent bar -->
  <rect x="0" y="0" width="100%" height="8" fill="url(#accent)"/>

  <!-- Logo area -->
  <rect x="50" y="50" width="100" height="100" rx="10" fill="${primaryColor}" opacity="0.1"/>
  <text x="100" y="110" text-anchor="middle" fill="${primaryColor}" font-family="Arial, sans-serif" font-size="36" font-weight="bold">EK</text>

  <!-- Main content -->
  <text x="200" y="120" fill="${textColor}" font-family="Arial, sans-serif" font-size="48" font-weight="bold">
    ${escapeXml(title.length > 30 ? title.substring(0, 30) + "..." : title)}
  </text>

  <text x="200" y="160" fill="${accentColor}" font-family="Arial, sans-serif" font-size="24">
    ${escapeXml(
        subtitle.length > 60 ? subtitle.substring(0, 60) + "..." : subtitle
    )}
  </text>

  <!-- Bottom branding -->
  <text x="50" y="580" fill="${accentColor}" font-family="Arial, sans-serif" font-size="18">
    ${domainData?.domain || "eve-kill.com"} • EVE Online Killboard
  </text>

  <!-- Decorative elements -->
  <circle cx="1050" cy="150" r="60" fill="${primaryColor}" opacity="0.1"/>
  <circle cx="1100" cy="400" r="40" fill="${primaryColor}" opacity="0.05"/>
  <circle cx="950" cy="500" r="80" fill="${primaryColor}" opacity="0.03"/>
</svg>`.trim();

    return svg;
}

/**
 * Generate fallback OG image when something goes wrong
 */
function generateFallbackOgImage() {
    const width = 1200;
    const height = 630;
    const primaryColor = "#3b82f6";

    return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#1a1a1a"/>
  <rect x="0" y="0" width="100%" height="8" fill="${primaryColor}"/>
  <text x="600" y="300" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="48" font-weight="bold">EVE-KILL</text>
  <text x="600" y="350" text-anchor="middle" fill="#6b7280" font-family="Arial, sans-serif" font-size="24">EVE Online Killboard</text>
</svg>`.trim();
}

/**
 * Format ISK values
 */
function formatISK(value: number): string {
    if (value >= 1e9) {
        return `${(value / 1e9).toFixed(1)}B ISK`;
    } else if (value >= 1e6) {
        return `${(value / 1e6).toFixed(1)}M ISK`;
    } else if (value >= 1e3) {
        return `${(value / 1e3).toFixed(1)}K ISK`;
    }
    return `${value.toLocaleString()} ISK`;
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
