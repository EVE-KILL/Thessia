export default defineNuxtRouteMiddleware(async (to) => {
    // Only run on client-side
    if (import.meta.server) return;

    const authStore = useAuthStore();

    // Initial auth check if not already done
    if (!authStore.isAuthenticated && !authStore.isLoading) {
        await authStore.checkAuth();
    }

    // Check if user is authenticated
    if (!authStore.isAuthenticated) {
        // Force full page reload to home page for unauthenticated users
        if (import.meta.client) {
            window.location.href = "/";
        }
        return;
    }

    // Check if user is an administrator
    if (!authStore.isAdministrator) {
        // Force full page reload to home page for non-admin users
        if (import.meta.client) {
            window.location.href = "/";
        }
        return;
    }
});
