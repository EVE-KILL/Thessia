import { z } from "zod";
import {
    invalidateDomainCache,
    invalidateUserCache,
} from "../../../../helpers/domainCache";

const updateDomainSchema = z.object({
    domain: z
        .string()
        .min(1)
        .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid domain format")
        .optional(),
    entityType: z.enum(["character", "corporation", "alliance"]).optional(),
    entityId: z.number().min(1).optional(),
    branding: z
        .object({
            primaryColor: z.string().optional(),
            secondaryColor: z.string().optional(),
            logoUrl: z.string().url().optional().or(z.literal("")),
            customCss: z.string().optional(),
        })
        .optional(),
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
        const validatedData = updateDomainSchema.parse(body);

        // Find the domain and verify ownership
        const existingDomain = await CustomDomains.findOne({
            domain_id: parseInt(domainId),
            owner_character_id: user.characterId,
        });

        if (!existingDomain) {
            throw createError({
                statusCode: 404,
                statusMessage: "Domain not found",
            });
        }

        // Check if domain name is being changed and if it's already taken
        if (
            validatedData.domain &&
            validatedData.domain !== existingDomain.domain
        ) {
            const domainExists = await CustomDomains.findOne({
                domain: validatedData.domain,
                domain_id: { $ne: parseInt(domainId) },
            });

            if (domainExists) {
                throw createError({
                    statusCode: 409,
                    statusMessage: "Domain already exists",
                });
            }
        }

        // Prepare update data
        const updateData: any = {
            updated_at: new Date(),
        };

        if (validatedData.domain) {
            updateData.domain = validatedData.domain;
            // Reset verification if domain changes
            updateData.verification_status = "pending";
            updateData.verified_at = null;
        }

        if (validatedData.entityType) {
            updateData.entity_type = validatedData.entityType;
        }

        if (validatedData.entityId) {
            updateData.entity_id = validatedData.entityId;
        }

        if (validatedData.branding) {
            updateData.branding = {
                primary_color: validatedData.branding.primaryColor,
                secondary_color: validatedData.branding.secondaryColor,
                logo_url: validatedData.branding.logoUrl,
                custom_css: validatedData.branding.customCss,
            };
        }

        // Update the domain
        const updatedDomain = await CustomDomains.findOneAndUpdate(
            {
                domain_id: parseInt(domainId),
                owner_character_id: user.characterId,
            },
            { $set: updateData },
            { new: true }
        );

        if (!updatedDomain) {
            throw createError({
                statusCode: 404,
                statusMessage: "Domain not found",
            });
        }

        // Clear cache for both old and new domain
        if (
            validatedData.domain &&
            validatedData.domain !== existingDomain.domain
        ) {
            await invalidateDomainCache(existingDomain.domain);
            await invalidateDomainCache(validatedData.domain);
        } else {
            await invalidateDomainCache(existingDomain.domain);
        }

        // Also invalidate user cache
        await invalidateUserCache(user.characterId.toString());

        return {
            success: true,
            domain: updatedDomain,
        };
    } catch (error: any) {
        console.error("Error updating domain:", error);

        if (error.statusCode) {
            throw error;
        }

        if (error.name === "ZodError") {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid request data",
                data: error.errors,
            });
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Internal server error",
        });
    }
});
