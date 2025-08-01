export default defineNuxtRouteMiddleware(async (to) => {
    // Only run on client-side
    if (import.meta.server) return;

    const auth = useAuth();

    // Initial auth check if not already done
    if (!auth.isAuthenticated.value && !auth.isLoading.value) {
        await auth.checkAuth();
    }

    // Check if user is authenticated
    if (!auth.isAuthenticated.value) {
        // Force full page reload to home page for unauthenticated users
        if (import.meta.client) {
            window.location.href = "/";
        }
        return;
    }

    // Check if user is an administrator
    if (!auth.isAdministrator.value) {
        // Force full page reload to home page for non-admin users
        if (import.meta.client) {
            window.location.href = "/";
        }
        return;
    }
});
