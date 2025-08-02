import type { H3Event } from "h3";

/**
 * Authenticates the user and verifies they have administrator privileges.
 *
 * @param event - The H3 event object
 * @returns Promise<IUserDocument> - The authenticated admin user
 * @throws createError with appropriate status codes for authentication failures
 *
 * @example
 * ```typescript
 * export default defineEventHandler(async (event) => {
 *     const adminUser = await requireAdminAuth(event);
 *     // User is authenticated and is an administrator
 *     // Continue with admin-only logic...
 * });
 * ```
 */
export async function requireAdminAuth(event: H3Event): Promise<IUserDocument> {
    // Add cache-control headers to prevent caching
    setResponseHeaders(event, {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
    });

    // Get authentication cookie
    const cookieName = "evelogin";
    const cookie = getCookie(event, cookieName);

    if (!cookie) {
        throw createError({
            statusCode: 401,
            statusMessage: "Authentication required",
        });
    }

    // Find user by cookie value
    const user = await Users.findOne({ uniqueIdentifier: cookie });
    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: "Invalid session",
        });
    }

    // Check if user is administrator
    if (!user.administrator) {
        throw createError({
            statusCode: 403,
            statusMessage: "Administrator access required",
        });
    }

    return user;
}
/**
 * Checks if the current user is an administrator without throwing errors.
 * Useful for conditional logic or non-critical admin features.
 *
 * @param event - The H3 event object
 * @returns Promise<{ isAdmin: boolean; user?: any }> - Admin status and user object if authenticated
 *
 * @example
 * ```typescript
 * export default defineEventHandler(async (event) => {
 *     const { isAdmin, user } = await checkAdminAuth(event);
 *     if (isAdmin) {
 *         // Show admin features
 *     } else {
 *         // Show regular user features
 *     }
 * });
 * ```
 */
export async function checkAdminAuth(event: H3Event) {
    try {
        const user = await requireAdminAuth(event);
        return { isAdmin: true, user };
    } catch {
        return { isAdmin: false };
    }
}
