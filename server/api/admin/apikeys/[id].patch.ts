export default defineEventHandler(async (event) => {
    // Authenticate and verify admin privileges
    await requireAdminAuth(event);

    try {
        // Get the API key ID from route parameters
        const keyId = getRouterParam(event, "id");

        if (!keyId) {
            throw createError({
                statusCode: 400,
                statusMessage: "API key ID is required",
            });
        }

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
            const existingKey = await ApiKeys.findOne({
                name: name.trim(),
                _id: { $ne: keyId },
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
        const updatedKey = await ApiKeys.findByIdAndUpdate(keyId, updateObj, {
            new: true,
            runValidators: true,
        }).select("-key"); // Don't return the actual key

        if (!updatedKey) {
            throw createError({
                statusCode: 404,
                statusMessage: "API key not found",
            });
        }

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

        // Handle mongoose validation errors
        if (error.name === "ValidationError") {
            throw createError({
                statusCode: 400,
                statusMessage: "Validation error: " + error.message,
            });
        }

        // Handle invalid ObjectId errors
        if (error.name === "CastError") {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid API key ID format",
            });
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
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
