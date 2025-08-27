/**
 * Create a new custom domain for the authenticated user
 */
export default defineEventHandler(async (event) => {
    // Add cache-control headers to prevent caching
    setResponseHeaders(event, {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
    });

    // Only allow POST method
    if (getMethod(event) !== "POST") {
        throw createError({
            statusCode: 405,
            statusMessage: "Method not allowed",
        });
    }

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
        // Get the request body
        const body = await readBody(event);

        // Validate required fields
        if (!body.domain || !body.entity_type || !body.entity_id) {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "Missing required fields: domain, entity_type, entity_id",
            });
        }

        // Validate domain format
        const domainRegex =
            /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
        if (!domainRegex.test(body.domain)) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid domain format",
            });
        }

        // Prevent main domain usage - block eve-kill.com but allow subdomains
        const normalizedDomain = body.domain.toLowerCase().trim();
        if (normalizedDomain === "eve-kill.com") {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "Cannot use the main eve-kill.com domain as a custom domain. Subdomains are allowed (e.g., corp.eve-kill.com).",
            });
        }

        // Additional blocked domains that should not be used as custom domains
        const blockedDomains = [
            "eve-kill.com",
            "www.eve-kill.com",
            "api.eve-kill.com",
            "admin.eve-kill.com",
            "cdn.eve-kill.com",
            "static.eve-kill.com",
        ];

        if (blockedDomains.includes(normalizedDomain)) {
            throw createError({
                statusCode: 400,
                statusMessage: `The domain ${body.domain} is reserved and cannot be used as a custom domain.`,
            });
        }

        // Validate entity type
        if (
            !["character", "corporation", "alliance"].includes(body.entity_type)
        ) {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "Invalid entity type. Must be character, corporation, or alliance",
            });
        }

        // Check if domain already exists
        const existingDomain = await CustomDomains.findOne({
            domain: body.domain.toLowerCase(),
        });

        if (existingDomain) {
            throw createError({
                statusCode: 409,
                statusMessage: "Domain already registered",
            });
        }

        // Check if user has permission to create domain for this entity
        let hasPermission = false;

        switch (body.entity_type) {
            case "character":
                if (body.entity_id === user.characterId) {
                    hasPermission = true;
                }
                break;
            case "corporation":
                // Check if user is in this corporation
                const character = await Characters.findOne({
                    character_id: user.characterId,
                });
                if (character && character.corporation_id === body.entity_id) {
                    hasPermission = true;
                }
                break;
            case "alliance":
                // Check if user's corporation is in this alliance
                const charWithAlliance = await Characters.findOne({
                    character_id: user.characterId,
                });
                if (
                    charWithAlliance &&
                    charWithAlliance.alliance_id === body.entity_id
                ) {
                    hasPermission = true;
                }
                break;
        }

        if (!hasPermission) {
            throw createError({
                statusCode: 403,
                statusMessage:
                    "You don't have permission to create a domain for this entity",
            });
        }

        // Verify the entity exists
        let entityExists = false;
        switch (body.entity_type) {
            case "character":
                entityExists = !!(await Characters.findOne({
                    character_id: body.entity_id,
                }));
                break;
            case "corporation":
                entityExists = !!(await Corporations.findOne({
                    corporation_id: body.entity_id,
                }));
                break;
            case "alliance":
                entityExists = !!(await Alliances.findOne({
                    alliance_id: body.entity_id,
                }));
                break;
        }

        if (!entityExists) {
            throw createError({
                statusCode: 404,
                statusMessage: "Entity not found",
            });
        }

        // Check user's domain limit (basic users get 1, premium could get more)
        const userDomainCount = await CustomDomains.countDocuments({
            owner_character_id: user.characterId,
        });

        const maxDomains = 1; // TODO: Make this configurable based on user tier
        if (userDomainCount >= maxDomains) {
            throw createError({
                statusCode: 429,
                statusMessage: `Domain limit reached. Maximum ${maxDomains} domains allowed.`,
            });
        }

        // Generate required fields
        const domainId = `dom_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
        const verificationToken = `verify_${Math.random()
            .toString(36)
            .substr(2, 32)}`;

        // Create the domain
        const domainData = {
            domain_id: domainId,
            verification_token: verificationToken,
            domain: body.domain.toLowerCase(),
            entity_type: body.entity_type,
            entity_id: body.entity_id,
            owner_character_id: user.characterId,
            default_page: body.default_page || "dashboard",
            branding: {
                primary_color:
                    body.branding?.primaryColor ||
                    body.branding?.primary_color ||
                    "#3b82f6",
                secondary_color:
                    body.branding?.secondaryColor ||
                    body.branding?.secondary_color ||
                    "#6b7280",
                logo_url:
                    body.branding?.logoUrl || body.branding?.logo_url || "",
                favicon_url:
                    body.branding?.faviconUrl ||
                    body.branding?.favicon_url ||
                    "",
                custom_css:
                    body.branding?.customCss || body.branding?.custom_css || "",
                header_title:
                    body.branding?.headerTitle ||
                    body.branding?.header_title ||
                    "",
                show_eve_kill_branding:
                    body.branding?.show_eve_kill_branding !== false,
            },
            public_campaigns: body.public_campaigns !== false,
            analytics_enabled: body.analytics_enabled !== false,
            verified: false,
            active: false, // Will be activated after verification
        };

        const newDomain = new CustomDomains(domainData);
        await newDomain.save();

        return {
            success: true,
            domain: newDomain.toJSON(),
            verification_token: newDomain.verification_token,
            message:
                "Domain created successfully. Please verify ownership to activate.",
        };
    } catch (error: any) {
        console.error("Error creating domain:", error);

        // Handle specific mongoose validation errors
        if (error.name === "ValidationError") {
            throw createError({
                statusCode: 400,
                statusMessage: `Validation error: ${error.message}`,
            });
        }

        // Re-throw if it's already a createError
        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to create domain",
        });
    }
});
