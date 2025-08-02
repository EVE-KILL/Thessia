export default defineEventHandler(async (event) => {
    await requireAdminAuth(event);

    try {
        const id = getRouterParam(event, "id");
        const body = await readBody(event);

        // Validate ID
        if (!id) {
            throw createError({
                statusCode: 400,
                statusMessage: "ID parameter is required",
            });
        }

        // Find the existing custom price
        const existingPrice = await CustomPrices.findById(id);
        if (!existingPrice) {
            throw createError({
                statusCode: 404,
                statusMessage: "Custom price not found",
            });
        }

        // Validate fields if provided
        if (
            body.type_id !== undefined &&
            (typeof body.type_id !== "number" || body.type_id <= 0)
        ) {
            throw createError({
                statusCode: 400,
                statusMessage: "type_id must be a positive number",
            });
        }

        if (
            body.price !== undefined &&
            (typeof body.price !== "number" || body.price < 0)
        ) {
            throw createError({
                statusCode: 400,
                statusMessage: "price must be a non-negative number",
            });
        }

        // Check for duplicate if type_id or date is being changed
        if (body.type_id || body.date) {
            const checkDate = body.date
                ? new Date(body.date)
                : existingPrice.date;
            const checkTypeId = body.type_id || existingPrice.type_id;

            const duplicatePrice = await CustomPrices.findOne({
                _id: { $ne: id },
                type_id: checkTypeId,
                date: {
                    $gte: new Date(
                        checkDate.getFullYear(),
                        checkDate.getMonth(),
                        checkDate.getDate()
                    ),
                    $lt: new Date(
                        checkDate.getFullYear(),
                        checkDate.getMonth(),
                        checkDate.getDate() + 1
                    ),
                },
            });

            if (duplicatePrice) {
                throw createError({
                    statusCode: 409,
                    statusMessage:
                        "Custom price already exists for this type_id and date",
                });
            }
        }

        // Update the custom price
        const updatedFields: any = {};
        if (body.type_id !== undefined) updatedFields.type_id = body.type_id;
        if (body.price !== undefined) updatedFields.price = body.price;
        if (body.date !== undefined) updatedFields.date = new Date(body.date);

        const updatedPrice = await CustomPrices.findByIdAndUpdate(
            id,
            updatedFields,
            { new: true, runValidators: true }
        );

        return {
            success: true,
            data: updatedPrice,
        };
    } catch (error: any) {
        console.error("Error updating custom price:", error);

        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to update custom price",
        });
    }
});
