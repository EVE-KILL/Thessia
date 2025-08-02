export default defineNuxtPlugin(async () => {
    // Initialize auth state on client-side only
    if (import.meta.client) {
        const auth = useAuth();

        // Ensure auth state is checked on page load
        if (!auth.isAuthenticated.value && !auth.isLoading.value) {
            await auth.checkAuth();
        }
    }
});
