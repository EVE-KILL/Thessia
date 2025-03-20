import { defineStore } from "pinia";

type UserState = {
    authenticated: boolean;
    loading: boolean;
    user: {
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
    };
    authError: string | null;
    redirectAfterLogin: string | null;
};

export const useUserStore = defineStore("user", {
    state: (): UserState => ({
        authenticated: false,
        loading: false,
        user: {
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
        },
        authError: null,
        redirectAfterLogin: null,
    }),

    getters: {
        isAuthenticated: (state) => state.authenticated,
        isLoading: (state) => state.loading,
        currentUser: (state) => state.user,
        hasError: (state) => state.authError !== null,
        errorMessage: (state) => state.authError,
        getRedirectUrl: (state) => state.redirectAfterLogin || "/",
        isTokenExpired: (state) => {
            if (!state.user.dateExpiration) return true;
            return new Date(state.user.dateExpiration) <= new Date();
        },
        isAdministrator: (state) => state.user.administrator,
    },

    actions: {
        /**
         * Set the redirect URL to return to after login
         */
        setRedirectUrl(url: string) {
            this.redirectAfterLogin = url;
        },

        /**
         * Clear any authentication errors
         */
        clearError() {
            this.authError = null;
        },

        /**
         * Initiate login with EVE SSO
         */
        async login() {
            try {
                this.loading = true;
                this.authError = null;

                // Get the URL to redirect to for authentication
                const { data } = await useFetch<{ authUrl: string }>(
                    "/api/auth/login",
                    {
                        query: {
                            redirect: this.redirectAfterLogin || undefined,
                        },
                    }
                );

                if (data.value?.authUrl) {
                    // Redirect to EVE SSO login page
                    window.location.href = data.value.authUrl;
                    return true;
                }

                this.authError = "Failed to generate authentication URL";
                return false;
            } catch (error) {
                console.debug("Login error:", error);
                this.authError =
                    error instanceof Error
                        ? error.message
                        : "Authentication failed";
                return false;
            } finally {
                this.loading = false;
            }
        },

        /**
         * Log the user out
         */
        async logout() {
            try {
                this.loading = true;

                // Call logout API
                await useFetch("/api/auth/logout", { method: "POST" });

                // Reset user state
                this.authenticated = false;
                this.user = {
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
                };

                return true;
            } catch (error) {
                console.debug("Logout error:", error);
                this.authError =
                    error instanceof Error ? error.message : "Logout failed";
                return false;
            } finally {
                this.loading = false;
            }
        },

        /**
         * Verify the current authentication state
         */
        async verify() {
            try {
                this.loading = true;

                const { data } = await useFetch<{
                    authenticated: boolean;
                    user?: {
                        characterId: number;
                        characterName: string;
                        scopes: string[];
                        canFetchCorporationKillmails: boolean;
                        dateExpiration: string;
                    };
                    message?: string;
                    requiresRefresh?: boolean;
                }>("/api/auth/verify");

                if (!data.value) {
                    this.authenticated = false;
                    return false;
                }

                // If authentication is valid and user data exists
                if (data.value.authenticated && data.value.user) {
                    this.authenticated = true;
                    this.user = data.value.user;
                    return true;
                }

                // Authentication failed
                this.authenticated = false;
                this.authError = data.value.message || "Verification failed";
                return false;
            } catch (error) {
                console.debug("Verification error:", error);
                this.authenticated = false;
                this.authError =
                    error instanceof Error
                        ? error.message
                        : "Verification failed";
                return false;
            } finally {
                this.loading = false;
            }
        },

        /**
         * Refresh the authentication token
         */
        async refreshToken() {
            try {
                this.loading = true;

                const { data, error } = await useFetch<{
                    success: boolean;
                    message: string;
                    expiresAt?: string;
                }>("/api/auth/refresh");

                if (error.value) {
                    this.authenticated = false;
                    this.authError = "Failed to refresh token";
                    return false;
                }

                if (data.value?.success) {
                    // If token was refreshed, verify again to get updated user info
                    return await this.verify();
                }

                this.authenticated = false;
                this.authError = data.value?.message || "Token refresh failed";
                return false;
            } catch (error) {
                console.debug("Token refresh error:", error);
                this.authenticated = false;
                this.authError =
                    error instanceof Error
                        ? error.message
                        : "Token refresh failed";
                return false;
            } finally {
                this.loading = false;
            }
        },

        /**
         * Get the user's profile data
         */
        async fetchProfile() {
            try {
                if (!this.authenticated) {
                    return null;
                }

                const { data, error } = await useFetch("/api/user/profile");

                if (error.value) {
                    console.debug("Error fetching profile:", error.value);
                    return null;
                }

                return data.value;
            } catch (error) {
                console.debug("Profile fetch error:", error);
                return null;
            }
        },
    },
});
