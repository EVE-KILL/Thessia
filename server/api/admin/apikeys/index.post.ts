export default defineEventHandler(async (event) => {
    // Authenticate and verify admin privileges
    const adminUser = await requireAdminAuth(event);

    try {
        // Get request body
        const body = await readBody(event);
        const { name, description } = body;

        // Validate required fields
        if (!name || typeof name !== "string" || name.trim() === "") {
            throw createError({
                statusCode: 400,
                statusMessage: "API key name is required",
            });
        }

        // Check if name already exists
        const existingKey = await ApiKeys.findOne({ name: name.trim() });
        if (existingKey) {
            throw createError({
                statusCode: 409,
                statusMessage: "API key name already exists",
            });
        }

        // Generate a secure random API key
        const crypto = await import("crypto");
        const apiKey = crypto.randomBytes(32).toString("hex");

        // Create new API key
        const newApiKey = new ApiKeys({
            name: name.trim(),
            key: apiKey,
            description: description?.trim() || "",
            active: true,
            createdBy: adminUser.characterId,
        });

        await newApiKey.save();

        // Return the new API key (including the key only this once)
        return {
            success: true,
            data: {
                name: newApiKey.name,
                key: newApiKey.key, // Only returned on creation
                description: newApiKey.description,
                active: newApiKey.active,
                createdBy: newApiKey.createdBy,
                createdByName: adminUser.characterName,
                createdAt: newApiKey.createdAt,
            },
            message: "API key created successfully",
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

        // Handle duplicate key errors
        if (error.code === 11000) {
            throw createError({
                statusCode: 409,
                statusMessage: "API key name already exists",
            });
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to create API key",
        });
    }
});
