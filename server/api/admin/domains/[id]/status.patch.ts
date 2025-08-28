export default defineEventHandler(async (event) => {
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

    const domainId = getRouterParam(event, "id");
    const body = await readBody(event);
    const { status } = body;

    if (!status || !["verified", "suspended", "active"].includes(status)) {
        throw createError({
            statusCode: 400,
            statusMessage:
                "Invalid status. Must be one of: verified, suspended, active",
        });
    }

    try {
        const domain = await CustomDomains.findById(domainId);

        if (!domain) {
            throw createError({
                statusCode: 404,
                statusMessage: "Domain not found",
            });
        }

        // Update domain status based on action
        switch (status) {
            case "verified":
                domain.verified = true;
                domain.active = true;
                domain.suspended = false;
                domain.dns_verified_at = new Date();
                break;
            case "suspended":
                domain.suspended = true;
                domain.active = false;
                domain.suspension_reason = `Suspended by administrator ${user.characterName}`;
                break;
            case "active":
                domain.active = true;
                domain.suspended = false;
                domain.suspension_reason = undefined;
                break;
        }

        await domain.save();

        return {
            success: true,
            message: `Domain ${status} successfully`,
            domain: {
                _id: domain._id,
                domain: domain.domain,
                status:
                    domain.verified && domain.active
                        ? "verified"
                        : domain.suspended
                        ? "suspended"
                        : "pending",
            },
        };
    } catch (error) {
        console.error("Error updating domain status:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to update domain status",
        });
    }
});
