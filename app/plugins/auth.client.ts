export default defineNuxtPlugin(async () => {
    // Initialize auth state on client-side only
    if (import.meta.client) {
        const authStore = useAuthStore();

        // Force store registration with dev tools by accessing a state property
        const _ = authStore.authenticated;

        // Ensure auth state is checked on page load
        if (!authStore.isAuthenticated && !authStore.isLoading) {
            await authStore.checkAuth();
        }
    }
});
