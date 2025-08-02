export default defineEventHandler(async (event) => {
    await requireAdminAuth(event);

    try {
        const id = getRouterParam(event, "id");

        // Validate ID
        if (!id) {
            throw createError({
                statusCode: 400,
                statusMessage: "ID parameter is required",
            });
        }

        // Find and delete the custom price
        const deletedPrice = await CustomPrices.findByIdAndDelete(id);

        if (!deletedPrice) {
            throw createError({
                statusCode: 404,
                statusMessage: "Custom price not found",
            });
        }

        return {
            success: true,
            message: "Custom price deleted successfully",
            data: deletedPrice,
        };
    } catch (error: any) {
        console.error("Error deleting custom price:", error);

        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to delete custom price",
        });
    }
});
