/**
 * Composable for getting user's default page preferences
 */
export const useUserDefaults = () => {
    const userSettingsStore = useUserSettingsStore();

    // Default pages when user is not authenticated or has no custom settings
    const fallbackDefaults = {
        character: "dashboard",
        corporation: "dashboard",
        alliance: "dashboard",
    };

    /**
     * Get user's default page for entity type
     */
    const getDefaultPage = (
        entityType: "character" | "corporation" | "alliance"
    ): string => {
        // Map entity type to user setting key
        const settingKey = `default${
            entityType.charAt(0).toUpperCase() + entityType.slice(1)
        }Page` as
            | "defaultCharacterPage"
            | "defaultCorporationPage"
            | "defaultAlliancePage";

        // Use the getSetting method from user settings store with fallback
        return userSettingsStore.getSetting(
            settingKey,
            fallbackDefaults[entityType]
        );
    };

    /**
     * Get default page for character profiles
     */
    const getDefaultCharacterPage = (): string => {
        return getDefaultPage("character");
    };

    /**
     * Get default page for corporation profiles
     */
    const getDefaultCorporationPage = (): string => {
        return getDefaultPage("corporation");
    };

    /**
     * Get default page for alliance profiles
     */
    const getDefaultAlliancePage = (): string => {
        return getDefaultPage("alliance");
    };

    return {
        getDefaultPage,
        getDefaultCharacterPage,
        getDefaultCorporationPage,
        getDefaultAlliancePage,
        fallbackDefaults,
        // Also expose loading state for UI feedback
        isLoading: computed(() => userSettingsStore.isLoading),
        error: computed(() => userSettingsStore.error),
    };
};
