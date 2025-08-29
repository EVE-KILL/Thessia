import { defineStore } from "pinia";

export interface UserSettings {
    killmailDelay: number;
    defaultCharacterPage: string;
    defaultCorporationPage: string;
    defaultAlliancePage: string;
    defaultSystemPage: string;
    killListAlternatingRows: boolean;
    killListMutedAlternatingRows: boolean;
}

interface UserSettingsResponse {
    success: boolean;
    settings: UserSettings;
}

interface UserSettingsState {
    settings: UserSettings | null;
    isLoading: boolean;
    error: string | null;
    lastFetchTime: number | null;
}

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Default settings fallback
const defaultSettings: UserSettings = {
    killmailDelay: 0,
    defaultCharacterPage: "dashboard",
    defaultCorporationPage: "dashboard",
    defaultAlliancePage: "dashboard",
    defaultSystemPage: "overview",
    killListAlternatingRows: true,
    killListMutedAlternatingRows: false,
};

export const useUserSettingsStore = defineStore("userSettings", {
    state: (): UserSettingsState => ({
        settings: null,
        isLoading: false,
        error: null,
        lastFetchTime: null,
    }),

    getters: {
        /**
         * Check if the cached settings are still valid
         */
        isCacheValid: (state) => {
            if (!state.lastFetchTime) return false;
            return Date.now() - state.lastFetchTime < CACHE_DURATION;
        },

        /**
         * Check if settings have been loaded
         */
        isLoaded: (state) => state.settings !== null,

        /**
         * Get all settings with defaults fallback
         */
        currentSettings: (state) => {
            return state.settings
                ? { ...defaultSettings, ...state.settings }
                : { ...defaultSettings };
        },

        /**
         * Individual setting getters with fallbacks
         */
        killmailDelay: (state) => {
            return (
                state.settings?.killmailDelay ?? defaultSettings.killmailDelay
            );
        },

        defaultCharacterPage: (state) => {
            return (
                state.settings?.defaultCharacterPage ??
                defaultSettings.defaultCharacterPage
            );
        },

        defaultCorporationPage: (state) => {
            return (
                state.settings?.defaultCorporationPage ??
                defaultSettings.defaultCorporationPage
            );
        },

        defaultAlliancePage: (state) => {
            return (
                state.settings?.defaultAlliancePage ??
                defaultSettings.defaultAlliancePage
            );
        },

        defaultSystemPage: (state) => {
            return (
                state.settings?.defaultSystemPage ??
                defaultSettings.defaultSystemPage
            );
        },

        killListAlternatingRows: (state) => {
            return (
                state.settings?.killListAlternatingRows ??
                defaultSettings.killListAlternatingRows
            );
        },

        killListMutedAlternatingRows: (state) => {
            return (
                state.settings?.killListMutedAlternatingRows ??
                defaultSettings.killListMutedAlternatingRows
            );
        },
    },

    actions: {
        /**
         * Fetch user settings from API
         */
        async fetchSettings(force = false) {
            const authStore = useAuthStore();

            // Don't fetch if user is not authenticated
            if (!authStore.isAuthenticated) {
                this.settings = null;
                this.error = null;
                return;
            }

            // Don't fetch if cache is valid and not forcing refresh
            if (!force && this.isCacheValid && this.settings) {
                return;
            }

            this.isLoading = true;
            this.error = null;

            try {
                const response = await $fetch<UserSettingsResponse>(
                    "/api/user/settings"
                );

                if (response.success && response.settings) {
                    this.settings = {
                        ...defaultSettings,
                        ...response.settings,
                    };
                    this.lastFetchTime = Date.now();
                } else {
                    throw new Error("Invalid response format");
                }
            } catch (err: any) {
                console.error("Failed to fetch user settings:", err);
                this.error = "Failed to load user settings";
                // Use default settings as fallback
                this.settings = { ...defaultSettings };
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Update a specific setting
         */
        async updateSetting<K extends keyof UserSettings>(
            key: K,
            value: UserSettings[K]
        ) {
            const authStore = useAuthStore();

            if (!authStore.isAuthenticated) {
                throw new Error(
                    "User must be authenticated to update settings"
                );
            }

            const previousValue = this.settings?.[key];

            // Optimistically update the local state
            if (this.settings) {
                (this.settings as any)[key] = value;
            } else {
                // If no settings loaded yet, create with defaults + new value
                this.settings = { ...defaultSettings, [key]: value };
            }

            try {
                await $fetch("/api/user/settings", {
                    method: "POST",
                    body: { [key]: value },
                });

                // Refresh settings to ensure we have the latest data
                await this.fetchSettings(true);
            } catch (err: any) {
                // Revert the optimistic update on error
                if (this.settings && previousValue !== undefined) {
                    (this.settings as any)[key] = previousValue;
                }
                console.error("Failed to update user setting:", err);
                throw err;
            }
        },

        /**
         * Update multiple settings at once
         */
        async updateSettings(updates: Partial<UserSettings>) {
            const authStore = useAuthStore();

            if (!authStore.isAuthenticated) {
                throw new Error(
                    "User must be authenticated to update settings"
                );
            }

            const previousValues: Record<string, any> = {};

            // Store previous values and optimistically update
            if (this.settings) {
                Object.keys(updates).forEach((key) => {
                    const typedKey = key as keyof UserSettings;
                    previousValues[typedKey] = this.settings![typedKey];
                    (this.settings as any)[typedKey] = (updates as any)[
                        typedKey
                    ];
                });
            } else {
                // If no settings loaded yet, create with defaults + updates
                this.settings = { ...defaultSettings, ...updates };
            }

            try {
                await $fetch("/api/user/settings", {
                    method: "POST",
                    body: updates,
                });

                // Refresh settings to ensure we have the latest data
                await this.fetchSettings(true);
            } catch (err: any) {
                // Revert all optimistic updates on error
                if (this.settings) {
                    Object.keys(previousValues).forEach((key) => {
                        const typedKey = key as keyof UserSettings;
                        (this.settings as any)[typedKey] =
                            previousValues[typedKey];
                    });
                }
                console.error("Failed to update user settings:", err);
                throw err;
            }
        },

        /**
         * Get a specific setting with fallback
         */
        getSetting<K extends keyof UserSettings>(
            key: K,
            fallback?: UserSettings[K]
        ): UserSettings[K] {
            if (!this.settings) {
                return fallback ?? defaultSettings[key];
            }
            return this.settings[key] ?? fallback ?? defaultSettings[key];
        },

        /**
         * Clear settings cache (useful when user logs out)
         */
        clearCache() {
            this.settings = null;
            this.lastFetchTime = null;
            this.error = null;
        },

        /**
         * Initialize settings for authenticated user
         */
        async initialize() {
            const authStore = useAuthStore();

            if (
                authStore.isAuthenticated &&
                !this.settings &&
                !this.isLoading
            ) {
                await this.fetchSettings();
            }
        },

        /**
         * Handle authentication state changes
         */
        onAuthChange(isAuthenticated: boolean) {
            if (isAuthenticated) {
                // User logged in, fetch settings
                this.fetchSettings();
            } else {
                // User logged out, clear cache
                this.clearCache();
            }
        },
    },
});
