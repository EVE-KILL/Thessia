/**
 * Edit corporation data
 * Updates corporation information with validation
 */
export default defineEventHandler(async (event) => {
    // Add cache-control headers to prevent caching
    setResponseHeaders(event, {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
    });

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

    // Only allow administrators
    if (!user.administrator) {
        throw createError({
            statusCode: 403,
            statusMessage: "Access denied. Administrator privileges required.",
        });
    }

    const corporationId = event.context.params?.id;

    if (!corporationId) {
        throw createError({
            statusCode: 400,
            statusMessage: "Corporation ID is required",
        });
    }

    try {
        const body = await readBody(event);

        // Find the corporation
        const corporation = await Corporations.findOne({
            corporation_id: parseInt(corporationId),
        });

        if (!corporation) {
            throw createError({
                statusCode: 404,
                statusMessage: "Corporation not found",
            });
        }

        // Build update object with only provided fields
        const updateData: any = {};

        if (body.name !== undefined) {
            if (
                typeof body.name !== "string" ||
                body.name.trim().length === 0
            ) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Name must be a non-empty string",
                });
            }
            updateData.name = body.name.trim();
        }

        if (body.ticker !== undefined) {
            if (typeof body.ticker !== "string") {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Ticker must be a string",
                });
            }
            updateData.ticker = body.ticker.trim();
        }

        if (body.alliance_id !== undefined) {
            if (
                body.alliance_id !== null &&
                !Number.isInteger(body.alliance_id)
            ) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Alliance ID must be an integer or null",
                });
            }
            updateData.alliance_id = body.alliance_id;
        }

        if (body.ceo_id !== undefined) {
            if (!Number.isInteger(body.ceo_id)) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "CEO ID must be an integer",
                });
            }
            updateData.ceo_id = body.ceo_id;
        }

        if (body.member_count !== undefined) {
            if (!Number.isInteger(body.member_count) || body.member_count < 0) {
                throw createError({
                    statusCode: 400,
                    statusMessage:
                        "Member count must be a non-negative integer",
                });
            }
            updateData.member_count = body.member_count;
        }

        if (body.tax_rate !== undefined) {
            if (
                typeof body.tax_rate !== "number" ||
                body.tax_rate < 0 ||
                body.tax_rate > 100
            ) {
                throw createError({
                    statusCode: 400,
                    statusMessage:
                        "Tax rate must be a number between 0 and 100",
                });
            }
            updateData.tax_rate = body.tax_rate;
        }

        if (body.description !== undefined) {
            if (typeof body.description !== "string") {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Description must be a string",
                });
            }
            updateData.description = body.description;
        }

        if (body.url !== undefined) {
            if (typeof body.url !== "string") {
                throw createError({
                    statusCode: 400,
                    statusMessage: "URL must be a string",
                });
            }
            updateData.url = body.url;
        }

        // Only update if there are fields to update
        if (Object.keys(updateData).length === 0) {
            throw createError({
                statusCode: 400,
                statusMessage: "No valid fields provided for update",
            });
        }

        // Update the corporation
        await Corporations.updateOne(
            { corporation_id: parseInt(corporationId) },
            { $set: updateData }
        );

        return {
            success: true,
            message: `Corporation "${corporation.name}" updated successfully`,
            updatedFields: Object.keys(updateData),
        };
    } catch (error) {
        console.error("Error updating corporation:", error);

        // Re-throw createError instances
        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to update corporation",
        });
    }
});
