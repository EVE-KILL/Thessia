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

        // Find and delete the API key
        const deletedKey = await prisma.apiKey.delete({
            where: { id: keyId },
        });

        if (!deletedKey) {
            throw createError({
                statusCode: 404,
                statusMessage: "API key not found",
            });
        }

        return {
            success: true,
            message: "API key deleted successfully",
            data: {
                name: deletedKey.name,
                deletedAt: new Date(),
            },
        };
    } catch (error: any) {
        // If it's already a createError, re-throw it
        if (error.statusCode) {
            throw error;
        }

        if (error.code === "P2025") {
            throw createError({
                statusCode: 404,
                statusMessage: "API key not found",
            });
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to delete API key",
        });
    }
});
