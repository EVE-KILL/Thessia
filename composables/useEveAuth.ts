import { useUserStore } from '~/stores/userStore';

/**
 * Composable for handling EVE Online authentication
 */
export function useEveAuth() {
  const userStore = useUserStore();
  const { t } = useI18n();

  /**
   * Check if authentication token is expiring soon
   * @param hours Hours threshold (default: 48)
   * @returns boolean indicating if token expiration is within the threshold
   */
  const isTokenExpiringSoon = (hours = 48): boolean => {
    if (!userStore.user.dateExpiration) return false;

    const expirationDate = new Date(userStore.user.dateExpiration);
    const now = new Date();
    const hoursDiff = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    return hoursDiff < hours;
  };

  /**
   * Format the expiration date in a user-friendly way
   */
  const formatExpirationDate = (): string => {
    if (!userStore.user.dateExpiration) return t('auth.noExpirationDate', 'No expiration date');

    const date = new Date(userStore.user.dateExpiration);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  /**
   * Initialize authentication process
   * @param redirectPath Path to redirect after authentication
   */
  const initiateAuth = (redirectPath?: string) => {
    if (redirectPath) {
      userStore.setRedirectUrl(redirectPath);
    }

    return userStore.login();
  };

  /**
   * Get character portrait URL
   * @param characterId EVE character ID
   * @param size Image size (default: 128)
   * @returns URL to character portrait
   */
  const getCharacterPortrait = (characterId: number | null, size = 128): string | null => {
    if (!characterId) return null;
    return `https://images.evetech.net/characters/${characterId}/portrait?size=${size}`;
  };

  return {
    isAuthenticated: computed(() => userStore.isAuthenticated),
    isLoading: computed(() => userStore.isLoading),
    currentUser: computed(() => userStore.user),
    hasError: computed(() => userStore.hasError),
    errorMessage: computed(() => userStore.errorMessage),

    isTokenExpiringSoon,
    formatExpirationDate,
    initiateAuth,
    getCharacterPortrait,

    login: userStore.login,
    logout: userStore.logout,
    refresh: userStore.refreshToken,
    verify: userStore.verify
  };
}
