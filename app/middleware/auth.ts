export default defineNuxtRouteMiddleware(async (to) => {
    // Only run on client-side
    if (import.meta.server) return;

    const authStore = useAuthStore();

    // Check if the route requires authentication
    if (to.meta.requiresAuth) {
        // Initial auth check if not already done
        if (!authStore.isAuthenticated && !authStore.isLoading) {
            await authStore.checkAuth();
        }

        // If we're still not authenticated after checking, redirect to login
        if (!authStore.isAuthenticated) {
            // Remember where the user was trying to go
            return navigateTo(
                `/user/login?redirect=${encodeURIComponent(to.fullPath)}`
            );
        }
    }
});
