export default defineEventHandler(async (event) => {
    // Admin authentication check
    const cookie = getCookie(event, "evelogin");
    if (!cookie) {
        throw createError({
            statusCode: 401,
            statusMessage: "Authentication required",
        });
    }

    const user = await Users.findOne({ uniqueIdentifier: cookie });
    if (!(user as any)?.administrator) {
        throw createError({
            statusCode: 403,
            statusMessage: "Administrator privileges required",
        });
    }

    const characterId = parseInt(getRouterParam(event, "id") || "0");
    if (!characterId) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid character ID",
        });
    }

    try {
        const body = await readBody(event);

        // Validate required fields
        if (!body.name?.trim()) {
            throw createError({
                statusCode: 400,
                statusMessage: "Character name is required",
            });
        }

        // Build update object with allowed editable fields
        const updateData: any = {
            name: body.name.trim(),
            updatedAt: new Date(),
        };

        // Optional fields - only update if provided
        if (body.corporation_id !== undefined) {
            updateData.corporation_id = parseInt(body.corporation_id) || null;
        }

        if (body.alliance_id !== undefined) {
            updateData.alliance_id = parseInt(body.alliance_id) || null;
        }

        if (body.faction_id !== undefined) {
            updateData.faction_id = parseInt(body.faction_id) || null;
        }

        if (body.security_status !== undefined) {
            const secStatus = parseFloat(body.security_status);
            if (!isNaN(secStatus)) {
                updateData.security_status = secStatus;
            }
        }

        if (body.birthday !== undefined) {
            updateData.birthday = body.birthday
                ? new Date(body.birthday)
                : null;
        }

        if (body.description !== undefined) {
            updateData.description = body.description;
        }

        if (body.gender !== undefined) {
            updateData.gender = body.gender;
        }

        if (body.race_id !== undefined) {
            updateData.race_id = parseInt(body.race_id) || null;
        }

        if (body.bloodline_id !== undefined) {
            updateData.bloodline_id = parseInt(body.bloodline_id) || null;
        }

        if (body.ancestry_id !== undefined) {
            updateData.ancestry_id = parseInt(body.ancestry_id) || null;
        }

        if (body.title !== undefined) {
            updateData.title = body.title;
        }

        // Update character
        const result = await Characters.updateOne(
            { character_id: characterId },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            throw createError({
                statusCode: 404,
                statusMessage: "Character not found",
            });
        }

        // Get updated character data
        const updatedCharacter = await Characters.findOne({
            character_id: characterId,
        });

        return {
            success: true,
            message: "Character updated successfully",
            character: updatedCharacter,
        };
    } catch (error: any) {
        console.error("Error updating character:", error);

        // Handle validation errors
        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to update character",
        });
    }
});
