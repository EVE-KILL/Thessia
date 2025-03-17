import { useUserStore } from '~/stores/userStore';

export default defineNuxtPlugin(async () => {
  // Get the user store
  const userStore = useUserStore();

  // Check authentication status on app initialization
  await userStore.verify();

  // Auto-refresh token when it's about to expire
  const router = useRouter();

  router.beforeEach(async (to, from, next) => {
    // Check if the token is expired and needs refreshing
    if (userStore.isAuthenticated && userStore.isTokenExpired) {
      await userStore.refreshToken();
    }

    // Check if the route requires authentication
    if (to.meta.requiresAuth && !userStore.isAuthenticated) {
      // Set the redirect URL to return to after login
      userStore.setRedirectUrl(to.fullPath);

      // Redirect to login
      return next('/user/login');
    }

    return next();
  });
});
