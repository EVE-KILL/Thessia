import { defineStore } from "pinia";

export interface UserData {
    characterId: number | null;
    characterName: string | null;
    corporationName: string | null;
    corporationId: number | null;
    allianceName: string | null;
    allianceId: number | null;
    scopes: string[];
    canFetchCorporationKillmails: boolean;
    dateExpiration: string | null;
    administrator: boolean;
    killmailDelay: number;
    uniqueIdentifier: string | null;
}

interface AuthState {
    authenticated: boolean;
    loading: boolean;
    user: UserData;
    error: string | null;
}

const defaultUserData: UserData = {
    characterId: null,
    characterName: null,
    corporationName: null,
    corporationId: null,
    allianceName: null,
    allianceId: null,
    scopes: [],
    canFetchCorporationKillmails: false,
    dateExpiration: null,
    administrator: false,
    killmailDelay: 0,
    uniqueIdentifier: null,
};

export const useAuthStore = defineStore("auth", {
    state: (): AuthState => ({
        authenticated: false,
        loading: false,
        user: { ...defaultUserData },
        error: null,
    }),

    getters: {
        isAuthenticated: (state) => state.authenticated,
        isLoading: (state) => state.loading,
        currentUser: (state) => state.user,
        hasError: (state) => state.error !== null,
        errorMessage: (state) => state.error,
        isAdministrator: (state) => state.user.administrator,
    },

    actions: {
        /**
         * Check/refresh the user's authentication status
         */
        async checkAuth() {
            // Use the runtime check for client-side
            const isClient = typeof window !== "undefined";
            if (this.loading || !isClient) return;

            this.loading = true;
            this.error = null;

            try {
                const response = await fetch("/api/auth/me", {
                    credentials: "include",
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (data?.authenticated && data.user) {
                    const wasAuthenticated = this.authenticated;
                    this.authenticated = true;
                    this.user = {
                        characterId: data.user.characterId,
                        characterName: data.user.characterName,
                        corporationName: data.user.corporationName,
                        corporationId: data.user.corporationId,
                        allianceName: data.user.allianceName || "",
                        allianceId: data.user.allianceId || 0,
                        scopes: data.user.scopes || [],
                        canFetchCorporationKillmails:
                            data.user.canFetchCorporationKillmails,
                        dateExpiration: data.user.dateExpiration,
                        administrator: data.user.administrator,
                        killmailDelay: data.user.killmailDelay || 0,
                        uniqueIdentifier: data.user.uniqueIdentifier || null,
                    };

                    // Initialize user settings when authenticated (only if not already authenticated)
                    const userSettingsStore = useUserSettingsStore();
                    if (!wasAuthenticated) {
                        userSettingsStore.onAuthChange(true);
                    }

                    // Initialize WebSocket connections when authenticated
                    const webSocketStore = useWebSocketStore();
                    webSocketStore.onAuthChange(true);
                } else {
                    const wasAuthenticated = this.authenticated;
                    this.authenticated = false;

                    // Clear user settings when authentication state changes from true to false
                    if (wasAuthenticated) {
                        const userSettingsStore = useUserSettingsStore();
                        userSettingsStore.onAuthChange(false);

                        // Clean up WebSocket connections when user logs out
                        const webSocketStore = useWebSocketStore();
                        webSocketStore.onAuthChange(false);
                    }
                }
            } catch (err: any) {
                this.authenticated = false;
                this.error =
                    err?.message || "Failed to validate authentication";
            } finally {
                this.loading = false;
            }
        },

        /**
         * Login with EVE SSO
         * @param redirectUrl URL to redirect after login
         * @param customScopes Optional array of scopes to request
         * @param killmailDelay Optional killmail delay in hours (0-72)
         */
        async login(
            redirectUrl: string | null = null,
            customScopes?: string[],
            killmailDelay?: number
        ) {
            this.error = null;

            try {
                const isClient = typeof window !== "undefined";
                const params: Record<string, any> = {
                    redirect:
                        redirectUrl ||
                        (isClient ? window.location.pathname : "/"),
                };

                if (customScopes) {
                    params.scopes = customScopes.join(",");
                }

                if (killmailDelay !== undefined) {
                    params.delay = killmailDelay;
                }

                const response = await fetch(
                    "/api/auth/loginurl?" +
                        new URLSearchParams(params).toString(),
                    {
                        method: "GET",
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                const isClientSide = typeof window !== "undefined";
                if (data?.url && isClientSide) {
                    window.location.href = data.url;
                }
            } catch (err: any) {
                this.error = err?.message || "Failed to initiate login";
            }
        },

        /**
         * Logout the current user
         */
        async logout() {
            this.loading = true;
            this.error = null;

            try {
                const response = await fetch("/api/auth/logout", {
                    method: "POST",
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                // Reset auth state
                this.authenticated = false;
                this.user = { ...defaultUserData };
                this.error = null;

                // Clear user settings when logging out
                const userSettingsStore = useUserSettingsStore();
                userSettingsStore.clearCache();

                // Return the user to the frontpage
                const isClient = typeof window !== "undefined";
                if (isClient) {
                    window.location.href = "/";
                }
            } catch (err: any) {
                this.error = err?.message || "Failed to logout";
            } finally {
                this.loading = false;
            }
        },

        /**
         * Reset auth state (useful for manual logout or errors)
         */
        resetAuth() {
            this.authenticated = false;
            this.user = { ...defaultUserData };
            this.error = null;
            this.loading = false;

            // Clear user settings when resetting auth
            const userSettingsStore = useUserSettingsStore();
            userSettingsStore.clearCache();

            // Clean up WebSocket connections when resetting auth
            const webSocketStore = useWebSocketStore();
            webSocketStore.cleanup();
        },

        /**
         * Clear any authentication errors
         */
        clearError() {
            this.error = null;
        },
    },
});
