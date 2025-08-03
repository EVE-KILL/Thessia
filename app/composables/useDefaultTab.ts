/**
 * Composable for determining the default tab based on user settings
 * Handles fallback to first available tab if user setting is invalid
 */
export const useDefaultTab = (
    pageType: "character" | "corporation" | "alliance",
    availableTabs: Array<{ id: string }>
) => {
    const userSettingsStore = useUserSettingsStore();
    const route = useRoute();

    /**
     * Get the default tab ID based on user settings and available tabs
     */
    const getDefaultTabId = (): string => {
        // If there's a hash in the URL, that takes precedence
        const hashTab = route.hash.slice(1);
        if (hashTab && availableTabs.some((tab) => tab.id === hashTab)) {
            return hashTab;
        }

        // Get user's preferred default tab for this page type
        let userPreferredTab: string;
        switch (pageType) {
            case "character":
                userPreferredTab = userSettingsStore.defaultCharacterPage;
                break;
            case "corporation":
                userPreferredTab = userSettingsStore.defaultCorporationPage;
                break;
            case "alliance":
                userPreferredTab = userSettingsStore.defaultAlliancePage;
                break;
            default:
                userPreferredTab = "dashboard";
        }

        // Check if the user's preferred tab exists in available tabs
        if (
            userPreferredTab &&
            availableTabs.some((tab) => tab.id === userPreferredTab)
        ) {
            return userPreferredTab;
        }

        // Fallback to first available tab
        return availableTabs[0]?.id || "dashboard";
    };

    /**
     * Reactive computed property for the default tab
     */
    const defaultTabId = computed(() => getDefaultTabId());

    return {
        defaultTabId,
        getDefaultTabId,
    };
};
