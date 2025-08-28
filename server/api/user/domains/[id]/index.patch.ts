import { z } from "zod";
import { invalidateDomainCache } from "../../../../utils/domainCacheManager";

// Enhanced Zod schema for Phase 2 domain updates
const updateDomainSchema = z.object({
    domain: z.string().min(1).optional(),
    branding: z
        .object({
            primary_color: z
                .string()
                .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
                .optional(),
            secondary_color: z
                .string()
                .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
                .optional(),
            accent_color: z
                .string()
                .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
                .optional(),
            background_color: z
                .string()
                .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
                .optional(),
            text_color: z
                .string()
                .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
                .optional(),
            logo_url: z.string().url().optional().or(z.literal("")),
            favicon_url: z.string().url().optional().or(z.literal("")),
            banner_image_url: z.string().url().optional().or(z.literal("")),
            background_image_url: z.string().url().optional().or(z.literal("")),
            header_title: z.string().max(100).optional(),
            welcome_message: z.string().max(500).optional(),
            secondary_message: z.string().max(300).optional(),
            cta_buttons: z
                .array(
                    z.object({
                        text: z.string().max(50),
                        url: z.string().max(500),
                        primary: z.boolean().default(false),
                        external: z.boolean().default(true),
                    })
                )
                .max(5)
                .optional(),
            font_family: z.string().max(100).optional(),
            font_size_base: z.number().min(10).max(24).optional(),
            custom_css: z.string().max(100000).optional(),
            css_variables: z.record(z.string(), z.string()).optional(),
            show_eve_kill_branding: z.boolean().optional(),
            theme_mode: z.enum(["light", "dark", "auto"]).optional(),
            border_radius: z.string().optional(),
            shadow_intensity: z
                .enum(["none", "light", "medium", "heavy"])
                .optional(),
        })
        .optional(),
    navigation: z
        .object({
            show_default_nav: z.boolean().optional(),
            sticky: z.boolean().optional(),
            // Per-icon visibility controls
            show_home: z.boolean().optional(),
            show_kills: z.boolean().optional(),
            show_wars: z.boolean().optional(),
            show_battles: z.boolean().optional(),
            show_campaigns: z.boolean().optional(),
            show_stats: z.boolean().optional(),
            show_tools: z.boolean().optional(),
            show_search: z.boolean().optional(),
            show_upload: z.boolean().optional(),
            show_theme_toggle: z.boolean().optional(),
            show_background_switcher: z.boolean().optional(),
            show_info_menu: z.boolean().optional(),
            show_user_menu: z.boolean().optional(),
            custom_links: z
                .array(
                    z.object({
                        label: z.string().max(50),
                        url: z.string().max(500),
                        external: z.boolean().default(false),
                        icon: z.string().max(100).optional(),
                        position: z.number().min(1).max(100),
                        access_level: z
                            .enum(["public", "members", "admin"])
                            .default("public"),
                        dropdown_items: z.array(z.any()).optional(),
                    })
                )
                .optional(),
        })
        .optional(),
    page_config: z
        .object({
            layout: z.enum(["default", "compact", "detailed"]).optional(),
            components: z
                .object({
                    recent_kills: z.boolean().optional(),
                    top_pilots: z.boolean().optional(),
                    campaigns: z.boolean().optional(),
                    battles: z.boolean().optional(),
                    stats_overview: z.boolean().optional(),
                    search_widget: z.boolean().optional(),
                    news_feed: z.boolean().optional(),
                    social_links: z.boolean().optional(),
                })
                .optional(),
            component_settings: z
                .object({
                    recent_kills_count: z
                        .union([
                            z.literal(5),
                            z.literal(10),
                            z.literal(20),
                            z.literal(50),
                        ])
                        .optional(),
                    top_pilots_count: z
                        .union([z.literal(5), z.literal(10), z.literal(15)])
                        .optional(),
                    time_range: z.enum(["24h", "7d", "30d", "all"]).optional(),
                    show_losses: z.boolean().optional(),
                    show_involved_kills: z.boolean().optional(),
                })
                .optional(),
        })
        .optional(),
    features: z
        .object({
            show_hero: z.boolean().optional(),
            show_stats: z.boolean().optional(),
            show_tracking_overview: z.boolean().optional(),
            show_campaigns: z.boolean().optional(),
            show_most_valuable: z.boolean().optional(),
            show_top_boxes: z.boolean().optional(),
            show_ship_analysis: z.boolean().optional(),
            featured_campaign_id: z.string().optional(),
        })
        .optional(),
    // Legacy support for backward compatibility
    entityType: z.enum(["character", "corporation", "alliance"]).optional(),
    entityId: z.number().min(1).optional(),
});

export default defineEventHandler(async (event) => {
    try {
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

        const domainId = getRouterParam(event, "id");
        if (!domainId) {
            throw createError({
                statusCode: 400,
                statusMessage: "Domain ID is required",
            });
        }

        const body = await readBody(event);
        console.log(
            "🔍 PATCH Debug - Raw Request Body:",
            JSON.stringify(body, null, 2)
        );

        const validatedData = updateDomainSchema.parse(body);
        console.log(
            "🔍 PATCH Debug - Validated Data:",
            JSON.stringify(validatedData, null, 2)
        );

        // Find the domain and verify ownership
        const existingDomain = await CustomDomains.findOne({
            domain_id: domainId,
            owner_character_id: user.characterId,
        });

        if (!existingDomain) {
            throw createError({
                statusCode: 404,
                statusMessage: "Domain not found",
            });
        }

        console.log(
            "🔍 PATCH Debug - Existing Domain Navigation:",
            JSON.stringify(existingDomain.navigation, null, 2)
        );

        // Check if domain name is being changed and if it's already taken
        if (
            validatedData.domain &&
            validatedData.domain !== existingDomain.domain
        ) {
            const domainExists = await CustomDomains.findOne({
                domain: validatedData.domain,
                domain_id: { $ne: domainId },
            });

            if (domainExists) {
                throw createError({
                    statusCode: 409,
                    statusMessage: "Domain already exists",
                });
            }
        }

        // Prepare update data using Object.assign for merging (like PHP's array_merge)
        const updateData: any = {
            updated_at: new Date(),
        };

        // Update top-level fields
        if (validatedData.domain) {
            updateData.domain = validatedData.domain;
            updateData.verified = false; // Reset verification if domain changes
            updateData.verification_method = undefined;
            updateData.dns_verified_at = null;
        }

        // Merge nested objects using Object.assign (similar to PHP's array_merge)
        // Convert Mongoose subdocuments to plain objects first to avoid metadata pollution
        if (validatedData.branding) {
            console.log("🔍 PATCH Debug - Merging Branding");
            const existingBranding = existingDomain.branding
                ? JSON.parse(JSON.stringify(existingDomain.branding))
                : {};
            updateData.branding = Object.assign(
                {},
                existingBranding,
                validatedData.branding
            );
            console.log(
                "🔍 PATCH Debug - Merged Branding:",
                JSON.stringify(updateData.branding, null, 2)
            );
        }

        if (validatedData.navigation) {
            console.log("🔍 PATCH Debug - Merging Navigation");
            console.log(
                "🔍 PATCH Debug - Incoming Navigation:",
                JSON.stringify(validatedData.navigation, null, 2)
            );

            // Convert Mongoose subdocument to plain object to avoid metadata
            const existingNavigation = existingDomain.navigation
                ? JSON.parse(JSON.stringify(existingDomain.navigation))
                : {};
            console.log(
                "🔍 PATCH Debug - Existing Navigation (clean):",
                JSON.stringify(existingNavigation, null, 2)
            );

            // Use Object.assign to merge navigation settings (like PHP array_merge)
            updateData.navigation = Object.assign(
                {},
                existingNavigation,
                validatedData.navigation
            );
            console.log(
                "🔍 PATCH Debug - Final Merged Navigation:",
                JSON.stringify(updateData.navigation, null, 2)
            );
        }

        if (validatedData.page_config) {
            console.log("🔍 PATCH Debug - Merging Page Config");
            const existingPageConfig = existingDomain.page_config
                ? JSON.parse(JSON.stringify(existingDomain.page_config))
                : {};
            updateData.page_config = Object.assign(
                {},
                existingPageConfig,
                validatedData.page_config
            );
            console.log(
                "🔍 PATCH Debug - Merged Page Config:",
                JSON.stringify(updateData.page_config, null, 2)
            );
        }

        if (validatedData.features) {
            console.log("🔍 PATCH Debug - Merging Features");
            const existingFeatures = existingDomain.features
                ? JSON.parse(JSON.stringify(existingDomain.features))
                : {};
            updateData.features = Object.assign(
                {},
                existingFeatures,
                validatedData.features
            );
            console.log(
                "🔍 PATCH Debug - Merged Features:",
                JSON.stringify(updateData.features, null, 2)
            );
        }

        // Legacy support
        if (validatedData.entityType) {
            updateData.entity_type = validatedData.entityType;
        }

        if (validatedData.entityId) {
            updateData.entity_id = validatedData.entityId;
        }

        console.log(
            "🔍 PATCH Debug - Final Update Data:",
            JSON.stringify(updateData, null, 2)
        );

        // Update the domain using $set to replace nested objects completely
        const updatedDomain = await CustomDomains.findOneAndUpdate(
            {
                domain_id: domainId,
                owner_character_id: user.characterId,
            },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedDomain) {
            throw createError({
                statusCode: 404,
                statusMessage: "Domain not found or update failed",
            });
        }

        console.log(
            "🔍 PATCH Debug - Updated Domain Navigation:",
            JSON.stringify(updatedDomain.navigation, null, 2)
        );

        // Clear ALL domain-related caches (database-driven invalidation)
        await invalidateDomainCache(updatedDomain.domain);

        return {
            success: true,
            domain: updatedDomain,
        };
    } catch (error) {
        console.error("Error updating domain:", error);

        if (error instanceof z.ZodError) {
            throw createError({
                statusCode: 400,
                statusMessage: "Validation error",
                data: error.issues,
            });
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to update domain",
        });
    }
});
