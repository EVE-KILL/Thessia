export default defineNuxtRouteMiddleware(async (to) => {
    // Skip maintenance check for the maintenance page itself to avoid infinite redirects
    if (to.path === "/maintenance") {
        return;
    }

    // Skip maintenance check for API routes (optional - you might want to block these too)
    if (to.path.startsWith("/api/")) {
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
            // Redirect to maintenance page
            return navigateTo("/maintenance");
        }
    } catch (error) {
        // On error, continue normally (don't block the site if maintenance check fails)
        console.error("Failed to check maintenance status:", error);
    }
});
