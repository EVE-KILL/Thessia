export default defineEventHandler(async (event) => {
    await requireAdminAuth(event);

    try {
        const body = await readBody(event);

        // Validate required fields
        if (!body.type_id || typeof body.type_id !== "number") {
            throw createError({
                statusCode: 400,
                statusMessage: "type_id is required and must be a number",
            });
        }

        if (!body.price || typeof body.price !== "number") {
            throw createError({
                statusCode: 400,
                statusMessage: "price is required and must be a number",
            });
        }

        // Set date to current date if not provided
        const date = body.date ? new Date(body.date) : new Date();

        // Check if custom price already exists for this type_id and date
        const existingPrice = await CustomPrices.findOne({
            type_id: body.type_id,
            date: {
                $gte: new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate()
                ),
                $lt: new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate() + 1
                ),
            },
        });

        if (existingPrice) {
            throw createError({
                statusCode: 409,
                statusMessage:
                    "Custom price already exists for this type_id and date",
            });
        }

        // Create new custom price
        const customPrice = new CustomPrices({
            type_id: body.type_id,
            price: body.price,
            date: date,
        });

        await customPrice.save();

        return {
            success: true,
            data: customPrice,
        };
    } catch (error: any) {
        console.error("Error creating custom price:", error);

        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to create custom price",
        });
    }
});
