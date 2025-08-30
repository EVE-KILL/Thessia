import { defineEventHandler } from "h3";

export default defineEventHandler(async (event) => {
    console.log("[Template POST] Handler called for URL:", event.node.req.url);
    console.log("[Template POST] Method:", event.node.req.method);

    // Simple test response
    return {
        success: true,
        message: "Handler is working",
        timestamp: new Date().toISOString(),
    };

    /*
    try {
        const domain = getRouterParam(event as any, "domain");
        if (!domain) {
            throw createError({
                statusCode: 400,
                statusMessage: "Domain parameter is required",
            });
        }

        // Parse the request body
        const body = await readBody(event);
        console.log('[Template POST] Received body:', body);
        const { name, template, description, customCss } = body;

        console.log('[Template POST] Parsed fields:', {
            hasName: !!name,
            hasTemplate: !!template,
            templateLength: template?.length || 0,
            hasCss: !!customCss
        });

        if (!name || !template) {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "Template name and template content are required",
            });
        }

        // Validate template content length
        if (template.length > 50000) {
            throw createError({
                statusCode: 400,
                statusMessage: "Template content too large (max 50KB)",
            });
        }

        // Validate name length
        if (name.length > 100) {
            throw createError({
                statusCode: 400,
                statusMessage: "Template name too long (max 100 characters)",
            });
        }

        // Authentication check
        const eveloginCookie = getCookie(event, "evelogin");
        if (!eveloginCookie) {
            throw createError({
                statusCode: 401,
                statusMessage: "Authentication required",
            });
        }

        // Get user session
        const session = await $fetch("/api/auth/me", {
            headers: {
                cookie: `evelogin=${eveloginCookie}`,
            },
        });

        if (!session || !session.authenticated) {
            throw createError({
                statusCode: 401,
                statusMessage: "Authentication failed",
            });
        }

        const user = session.user;

        // Get domain configuration to verify access and ownership
        const domainConfig = await CustomDomains.findOne({
            domain: domain.toLowerCase(),
            active: true,
            verified: true,
        });

        if (!domainConfig) {
            throw createError({
                statusCode: 404,
                statusMessage: "Domain not found or not active",
            });
        }

        // Check if user owns the domain
        if (domainConfig.owner_character_id !== user?.characterId) {
            throw createError({
                statusCode: 403,
                statusMessage: "You do not have permission to modify this domain's templates",
            });
        }

        // Check if template with this name already exists
        const existingTemplates = domainConfig.dashboard_templates || [];
        const existingTemplate = existingTemplates.find((t) => t.name === name);

        const templateData = {
            name,
            template,
            description: description || "",
            customCss: customCss || "",
            created_at: new Date(),
            updated_at: new Date(),
        };

        if (existingTemplate) {
            // Update existing template
            const templateIndex = existingTemplates.findIndex(
                (t) => t.name === name
            );
            existingTemplates[templateIndex] = {
                ...templateData,
                created_at: existingTemplate.created_at, // Keep original creation date
            };
        } else {
            // Check template limit
            if (existingTemplates.length >= 20) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Maximum 20 templates per domain",
                });
            }

            // Add new template
            existingTemplates.push(templateData);
        }

        // Update the domain with new/updated template
        const updatedDomain = await CustomDomains.findOneAndUpdate(
            {
                domain: domain.toLowerCase(),
                active: true,
                verified: true,
            },
            {
                $set: {
                    dashboard_templates: existingTemplates,
                    updated_at: new Date(),
                },
            },
            {
                new: true,
                select: "dashboard_templates",
            }
        );

        if (!updatedDomain) {
            throw createError({
                statusCode: 404,
                statusMessage: "Domain not found",
            });
        }

        return {
            success: true,
            template: templateData,
            message: existingTemplate
                ? "Template updated successfully"
                : "Template created successfully",
        };
    } catch (error: any) {
        console.error("Error saving dashboard template:", error);

        // Forward HTTP errors
        if (error.statusCode) {
            throw error;
        }

        // Otherwise, create a generic error
        throw createError({
            statusCode: 500,
            statusMessage: "Error saving dashboard template",
            message: error.message || "Error saving dashboard template",
        });
    }
    */
});
