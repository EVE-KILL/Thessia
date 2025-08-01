export default defineNuxtRouteMiddleware(async (to) => {
    // Skip maintenance check for the maintenance page itself to avoid infinite redirects
    if (to.path === "/maintenance") {
        return;
    }

    // Always allow maintenance API endpoints
    if (to.path.startsWith("/api/maintenance/")) {
        return;
    }

    // Define pages that should pass through during maintenance
    const allowedPages = [
        "/kill", // Kill detail pages like /kill/128753181
        "/api/killmail", // API endpoint for killmails
        "/api/comments", // API endpoint for comments
        "/about",
        "/faq",
        "/status",
    ];

    // Check if current path is in allowed pages
    const isAllowedPage = allowedPages.some((allowedPath) => {
        return to.path.startsWith(allowedPath);
    });

    // If this is an allowed page, skip maintenance check
    if (isAllowedPage) {
        return;
    }

    // Check maintenance state via API call
    try {
        const maintenanceState = (await $fetch("/api/maintenance/status")) as {
            isEnabled: boolean;
            message: string;
            lastChecked: string;
        };

        if (maintenanceState?.isEnabled) {
            // If maintenance is enabled, block all other API routes
            if (to.path.startsWith("/api/")) {
                throw createError({
                    statusCode: 503,
                    statusMessage:
                        "Service Unavailable - Site is currently under maintenance",
                });
            }

            // For non-API routes, redirect to maintenance page
            // Note: The maintenance page itself will show with 200 status to avoid Nuxt error handling
            // but the middleware ensures proper access control
            return navigateTo("/maintenance");
        }
    } catch (error) {
        // If this is already a 503 error from maintenance blocking, re-throw it
        if (error.statusCode === 503) {
            throw error;
        }

        // On other errors, continue normally (don't block the site if maintenance check fails)
        console.error("Failed to check maintenance status:", error);
    }
});
