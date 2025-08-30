/**
 * Create a new custom domain for the authenticated user - Phase 2
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

        // PHASE 2: Support both single-entity (legacy) and multi-entity formats
        if (!body.domain) {
            throw createError({
                statusCode: 400,
                statusMessage: "Missing required field: domain",
            });
        }

        // Convert single-entity format to multi-entity format if needed
        let entitiesArray;
        if (
            body.entities &&
            Array.isArray(body.entities) &&
            body.entities.length > 0
        ) {
            // Multi-entity format
            entitiesArray = body.entities;
        } else if (body.entity_type && body.entity_id) {
            // Legacy single-entity format
            entitiesArray = [
                {
                    entity_type: body.entity_type,
                    entity_id: body.entity_id,
                    primary: true,
                    show_in_nav: true,
                },
            ];
        } else {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "Missing required fields: entities (array) or entity_type and entity_id",
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

        // PHASE 2: Validate entities array
        if (body.entities.length > 10) {
            throw createError({
                statusCode: 400,
                statusMessage: "Maximum 10 entities allowed per domain",
            });
        }

        // Validate each entity and check permissions
        let primaryCount = 0;
        const validatedEntities = [];

        for (const entityData of body.entities) {
            if (!entityData.entity_type || !entityData.entity_id) {
                throw createError({
                    statusCode: 400,
                    statusMessage:
                        "Each entity must have entity_type and entity_id",
                });
            }

            // Validate entity type
            if (
                !["character", "corporation", "alliance"].includes(
                    entityData.entity_type
                )
            ) {
                throw createError({
                    statusCode: 400,
                    statusMessage:
                        "Invalid entity type. Must be character, corporation, or alliance",
                });
            }

            // Count primary entities
            if (entityData.primary) {
                primaryCount++;
            }

            // PHASE 2: Remove permission restrictions - allow any public entity
            // Users can now add any character, corporation, or alliance that exists
            // This enables true multi-entity domains for showcasing multiple entities

            // Verify the entity exists
            let entityExists = false;
            switch (entityData.entity_type) {
                case "character":
                    entityExists = !!(await Characters.findOne({
                        character_id: entityData.entity_id,
                    }));
                    break;
                case "corporation":
                    entityExists = !!(await Corporations.findOne({
                        corporation_id: entityData.entity_id,
                    }));
                    break;
                case "alliance":
                    entityExists = !!(await Alliances.findOne({
                        alliance_id: entityData.entity_id,
                    }));
                    break;
            }

            if (!entityExists) {
                throw createError({
                    statusCode: 404,
                    statusMessage: `Entity ${entityData.entity_type} ${entityData.entity_id} not found`,
                });
            }

            // Add validated entity
            validatedEntities.push({
                entity_type: entityData.entity_type,
                entity_id: entityData.entity_id,
                display_name: entityData.display_name || undefined,
                show_in_nav: entityData.show_in_nav !== false,
                show_in_stats: entityData.show_in_stats !== false,
                primary: entityData.primary === true,
                color_code: entityData.color_code || undefined,
            });
        }

        // Ensure exactly one primary entity
        if (primaryCount !== 1) {
            // If no primary specified, make the first one primary
            if (primaryCount === 0 && validatedEntities.length > 0) {
                validatedEntities[0].primary = true;
            } else {
                throw createError({
                    statusCode: 400,
                    statusMessage:
                        "Exactly one entity must be marked as primary",
                });
            }
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

        // Special handling for eve-kill.com subdomains
        const isEveKillSubdomain = normalizedDomain.endsWith('.eve-kill.com');
        
        // For eve-kill.com subdomains, also check for potential clashes with existing subdomains
        if (isEveKillSubdomain) {
            // Extract subdomain part (e.g., "corp" from "corp.eve-kill.com")
            const subdomainPart = normalizedDomain.replace('.eve-kill.com', '');
            
            // Check if any existing domain uses this subdomain pattern
            const conflictingDomain = await CustomDomains.findOne({
                domain: { $regex: `^${subdomainPart}\\.eve-kill\\.com$`, $options: 'i' }
            });
            
            if (conflictingDomain) {
                throw createError({
                    statusCode: 409,
                    statusMessage: `The subdomain ${subdomainPart}.eve-kill.com is already registered`,
                });
            }
        }

        // PHASE 2: Check user's domain limit (10 domains per user)
        const userDomainCount = await CustomDomains.countDocuments({
            owner_character_id: user.characterId,
        });

        const maxDomains = 10; // Phase 2: Increased limit
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

        // PHASE 2: Create domain with enhanced structure
        const domainData = {
            domain_id: domainId,
            verification_token: verificationToken,
            domain: body.domain.toLowerCase(),
            owner_character_id: user.characterId,

            // Multi-entity support
            entities: validatedEntities,

            // Enhanced branding with defaults
            branding: {
                primary_color: body.branding?.primary_color || "#3b82f6",
                secondary_color: body.branding?.secondary_color || "#6b7280",
                accent_color: body.branding?.accent_color,
                background_color: body.branding?.background_color,
                text_color: body.branding?.text_color,
                logo_url: body.branding?.logo_url || "",
                favicon_url: body.branding?.favicon_url || "",
                banner_image_url: body.branding?.banner_image_url,
                background_image_url: body.branding?.background_image_url,
                header_title: body.branding?.header_title || "",
                font_family: body.branding?.font_family,
                font_size_base: body.branding?.font_size_base || 16,
                custom_css: body.branding?.custom_css || "",
                css_variables: body.branding?.css_variables || {},
                show_eve_kill_branding:
                    body.branding?.show_eve_kill_branding !== false,
                theme_mode: body.branding?.theme_mode || "auto",
                border_radius: body.branding?.border_radius || "0.375rem",
                shadow_intensity: body.branding?.shadow_intensity || "medium",
            },

            // Navigation configuration
            navigation: {
                show_default_nav: body.navigation?.show_default_nav !== false,
                nav_style: body.navigation?.nav_style || "horizontal",
                custom_links: body.navigation?.custom_links || [],
                nav_position: body.navigation?.nav_position || "top",
                show_search: body.navigation?.show_search !== false,
                show_user_menu: body.navigation?.show_user_menu !== false,
                sticky: body.navigation?.sticky !== false,
            },

            // Page configuration
            page_config: {
                layout: body.page_config?.layout || "default",
                components: {
                    recent_kills:
                        body.page_config?.components?.recent_kills !== false,
                    top_pilots:
                        body.page_config?.components?.top_pilots !== false,
                    campaigns:
                        body.page_config?.components?.campaigns !== false,
                    battles: body.page_config?.components?.battles !== false,
                    stats_overview:
                        body.page_config?.components?.stats_overview !== false,
                    search_widget:
                        body.page_config?.components?.search_widget !== false,
                    news_feed: body.page_config?.components?.news_feed === true,
                    social_links:
                        body.page_config?.components?.social_links === true,
                },
                component_settings: {
                    recent_kills_count:
                        body.page_config?.component_settings
                            ?.recent_kills_count || 10,
                    top_pilots_count:
                        body.page_config?.component_settings
                            ?.top_pilots_count || 10,
                    time_range:
                        body.page_config?.component_settings?.time_range ||
                        "7d",
                    show_losses:
                        body.page_config?.component_settings?.show_losses !==
                        false,
                    show_involved_kills:
                        body.page_config?.component_settings
                            ?.show_involved_kills !== false,
                },
            },

            public_campaigns: body.public_campaigns !== false,
            verified: isEveKillSubdomain, // Auto-verify eve-kill.com subdomains
            active: isEveKillSubdomain,   // Auto-activate eve-kill.com subdomains
            verified_at: isEveKillSubdomain ? new Date() : undefined,
        };

        const newDomain = new CustomDomains(domainData);
        await newDomain.save();

        // Different messages for eve-kill.com subdomains vs external domains
        const message = isEveKillSubdomain
            ? "Eve-kill.com subdomain created and activated successfully! Your custom killboard is ready to use."
            : "Domain created successfully. Please verify ownership to activate.";

        return {
            success: true,
            domain: newDomain.toJSON(),
            message,
            isEveKillSubdomain, // Let frontend know if this is an eve-kill subdomain
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
