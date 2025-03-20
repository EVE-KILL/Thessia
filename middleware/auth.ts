export default defineNuxtRouteMiddleware(async (to) => {
  // Only run on client-side
  if (process.server) return;

  const auth = useAuth();

  // Check if the route requires authentication
  if (to.meta.requiresAuth) {
    // Initial auth check if not already done
    if (!auth.isAuthenticated.value && !auth.isLoading.value) {
      await auth.checkAuth();
    }

    // If we're still not authenticated after checking, redirect to login
    if (!auth.isAuthenticated.value) {
      // Remember where the user was trying to go
      return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
    }
  }
});
