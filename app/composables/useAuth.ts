import { useState } from "#app";

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

/**
 * Composable for handling EVE Online authentication
 */
export function useAuth() {
    // Access global auth state with proper defaults
    const authenticated = useState<boolean>("auth.authenticated", () => false);
    const loading = useState<boolean>("auth.loading", () => false);
    const user = useState<UserData>("auth.user", () => ({
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
    }));
    const authError = useState<string | null>("auth.error", () => null);

    /**
     * Check/refresh the user's authentication status
     */
    const checkAuth = async () => {
        if (loading.value || !import.meta.client) return;

        loading.value = true;

        try {
            const { data, error } = await useFetch("/api/auth/me", {
                credentials: "include",
            });

            if (error.value) {
                authError.value = error.value.message || "Authentication error";
                authenticated.value = false;
                return;
            }

            if (data.value?.authenticated && data.value.user) {
                authenticated.value = true;

                user.value = {
                    characterId: data.value.user.characterId,
                    characterName: data.value.user.characterName,
                    corporationName: data.value.user.corporationName,
                    corporationId: data.value.user.corporationId,
                    allianceName: data.value.user.allianceName || "",
                    allianceId: data.value.user.allianceId || 0,
                    scopes: data.value.user.scopes || [],
                    canFetchCorporationKillmails:
                        data.value.user.canFetchCorporationKillmails,
                    dateExpiration: data.value.user.dateExpiration,
                    administrator: data.value.user.administrator,
                    killmailDelay: data.value.user.killmailDelay || 0,
                    uniqueIdentifier: data.value.user.uniqueIdentifier || null,
                };
            } else {
                authenticated.value = false;
            }
        } catch (err) {
            authenticated.value = false;
            authError.value = "Failed to validate authentication";
        } finally {
            loading.value = false;
        }
    };

    /**
     * Login with EVE SSO
     * @param redirectUrl URL to redirect after login
     * @param customScopes Optional array of scopes to request
     * @param killmailDelay Optional killmail delay in hours (0-72)
     */
    const login = async (
        redirectUrl: string | null = null,
        customScopes?: string[],
        killmailDelay?: number
    ) => {
        try {
            const { data, error } = await useFetch("/api/auth/loginurl", {
                method: "GET",
                params: {
                    redirect:
                        redirectUrl ||
                        (import.meta.client ? window.location.pathname : "/"),
                    scopes: customScopes ? customScopes.join(",") : undefined,
                    delay: killmailDelay || undefined,
                },
            });

            if (error.value) {
                authError.value = error.value.message || "Login error";
                return;
            }

            if (data.value?.url && import.meta.client) {
                window.location.href = data.value.url;
            }
        } catch (err) {
            authError.value = "Failed to initiate login";
        }
    };

    /**
     * Logout the current user
     */
    const logout = async () => {
        loading.value = true;

        try {
            const { data, error } = await useFetch("/api/auth/logout");

            if (error.value) {
                authError.value = error.value.message || "Logout error";
                return;
            }

            // Reset auth state
            authenticated.value = false;
            user.value = {
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
            authError.value = null;

            // Return the user to the frontpage
            window.location.href = "/";
        } catch (err) {
            authError.value = "Failed to logout";
        } finally {
            loading.value = false;
        }
    };

    // Computed properties
    const isAuthenticated = computed(() => authenticated.value);
    const isLoading = computed(() => loading.value);
    const currentUser = computed(() => user.value);
    const hasError = computed(() => authError.value !== null);
    const errorMessage = computed(() => authError.value);
    const isAdministrator = computed(() => user.value.administrator);

    return {
        authenticated,
        loading,
        user,
        authError,
        isAuthenticated,
        isLoading,
        currentUser,
        hasError,
        errorMessage,
        isAdministrator,
        checkAuth,
        login,
        logout,
    };
}
