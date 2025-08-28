/**
 * Get all domains owned by the authenticated user
 */
export default defineEventHandler(async (event) => {
    // Add cache-control headers to prevent caching
    setResponseHeaders(event, {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
    });

    // Get the cookie value using the hardcoded cookie name
    const cookieName = "evelogin";
    const cookie = getCookie(event, cookieName);

    if (!cookie) {
        throw createError({
            statusCode: 401,
            statusMessage: "Authentication required",
        });
    }

    // Find the user by uniqueIdentifier
    const user = await Users.findOne({ uniqueIdentifier: cookie });

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: "Invalid authentication",
        });
    }

    try {
        // Get user's domains
        const domains = await CustomDomains.find({
            owner_character_id: user.characterId,
        }).sort({ created_at: -1 });

        // Enhance domains with entity information
        const enhancedDomains = await Promise.all(
            domains.map(async (domain) => {
                let entityInfo = null;

                try {
                    switch (domain.entity_type) {
                        case "character":
                            entityInfo = await Characters.findOne(
                                {
                                    character_id: domain.entity_id,
                                },
                                { name: 1, character_id: 1 }
                            );
                            break;
                        case "corporation":
                            entityInfo = await Corporations.findOne(
                                {
                                    corporation_id: domain.entity_id,
                                },
                                { name: 1, ticker: 1, corporation_id: 1 }
                            );
                            break;
                        case "alliance":
                            entityInfo = await Alliances.findOne(
                                {
                                    alliance_id: domain.entity_id,
                                },
                                { name: 1, ticker: 1, alliance_id: 1 }
                            );
                            break;
                    }
                } catch (error) {
                    console.error(
                        `Error fetching entity info for domain ${domain.domain}:`,
                        error
                    );
                }

                // Convert to plain object and include verification token for the domain owner
                const domainObj = domain.toObject();

                return {
                    ...domainObj,
                    verification_token: domain.verification_token, // Include for domain owner
                    entity_info: entityInfo,
                };
            })
        );

        return {
            success: true,
            domains: enhancedDomains,
            total: domains.length,
        };
    } catch (error) {
        console.error("Error fetching user domains:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to fetch domains",
        });
    }
});
