import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
    // Authenticate and verify admin privileges
    await requireAdminAuth(event);

    try {
        // Get the API key ID from route parameters
        const keyIdParam = getRouterParam(event, "id");

        if (!keyIdParam || Number.isNaN(Number(keyIdParam))) {
            throw createError({
                statusCode: 400,
                statusMessage: "API key ID is required",
            });
        }
        const keyId = Number(keyIdParam);

        // Get request body
        const body = await readBody(event);
        const { name, description, active } = body;

        // Build update object with only provided fields
        const updateObj: any = {};

        if (name !== undefined) {
            if (typeof name !== "string" || name.trim() === "") {
                throw createError({
                    statusCode: 400,
                    statusMessage: "API key name must be a non-empty string",
                });
            }

            // Check if name already exists (excluding current key)
            const existingKey = await prisma.apiKey.findFirst({
                where: {
                    name: name.trim(),
                    id: { not: keyId },
                },
            });
            if (existingKey) {
                throw createError({
                    statusCode: 409,
                    statusMessage: "API key name already exists",
                });
            }

            updateObj.name = name.trim();
        }

        if (description !== undefined) {
            updateObj.description =
                typeof description === "string" ? description.trim() : "";
        }

        if (active !== undefined) {
            if (typeof active !== "boolean") {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Active field must be a boolean",
                });
            }
            updateObj.active = active;
        }

        // If no valid fields to update
        if (Object.keys(updateObj).length === 0) {
            throw createError({
                statusCode: 400,
                statusMessage: "No valid fields provided for update",
            });
        }

        // Find and update the API key
        const updatedKey = await prisma.apiKey.update({
            where: { id: keyId },
            data: updateObj,
            select: {
                id: true,
                name: true,
                description: true,
                active: true,
                last_used: true,
                created_at: true,
                created_by: true,
            },
        });

        return {
            success: true,
            message: "API key updated successfully",
            data: updatedKey,
        };
    } catch (error: any) {
        // If it's already a createError, re-throw it
        if (error.statusCode) {
            throw error;
        }

        if (error.code === "P2025") {
            throw createError({
                statusCode: 400,
                statusMessage: "API key not found",
            });
        }

        // Handle duplicate key errors
        if (error.code === "P2002") {
            throw createError({
                statusCode: 409,
                statusMessage: "API key name already exists",
            });
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to update API key",
        });
    }
});
