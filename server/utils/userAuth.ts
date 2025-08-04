import type { H3Event } from "h3";

/**
 * Authenticates the user and returns the authenticated user document.
 *
 * @param event - The H3 event object
 * @returns Promise<IUserDocument> - The authenticated user
 * @throws createError with appropriate status codes for authentication failures
 *
 * @example
 * ```typescript
 * export default defineEventHandler(async (event) => {
 *     const user = await requireUserAuth(event);
 *     // User is authenticated
 *     // Continue with user-specific logic...
 * });
 * ```
 */
export async function requireUserAuth(event: H3Event): Promise<IUserDocument> {
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

    return user;
}

/**
 * Checks if the current user is authenticated without throwing errors.
 * Useful for conditional logic or optional authentication features.
 *
 * @param event - The H3 event object
 * @returns Promise<{ isAuthenticated: boolean; user?: IUserDocument }> - Auth status and user object if authenticated
 *
 * @example
 * ```typescript
 * export default defineEventHandler(async (event) => {
 *     const { isAuthenticated, user } = await checkUserAuth(event);
 *     if (isAuthenticated) {
 *         // Show authenticated user features
 *     } else {
 *         // Show public features
 *     }
 * });
 * ```
 */
export async function checkUserAuth(event: H3Event) {
    try {
        const user = await requireUserAuth(event);
        return { isAuthenticated: true, user };
    } catch {
        return { isAuthenticated: false };
    }
}

/**
 * Default export containing all user authentication utilities
 */
export default {
    requireUserAuth,
    checkUserAuth,
};
