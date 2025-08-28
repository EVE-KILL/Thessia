import { defineStore } from "pinia";

export interface DomainBranding {
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    background_color?: string;
    text_color?: string;
    logo_url?: string;
    favicon_url?: string;
    banner_image_url?: string;
    background_image_url?: string;
    header_title?: string;
    welcome_message?: string;
    secondary_message?: string;
    cta_buttons?: Array<{
        text: string;
        url: string;
        primary: boolean;
        external: boolean;
    }>;
    font_family?: string;
    font_size_base?: number;
    custom_css?: string;
    css_variables?: Record<string, string>;
    show_eve_kill_branding?: boolean;
    theme_mode?: "light" | "dark" | "auto";
    border_radius?: string;
    shadow_intensity?: "none" | "light" | "medium" | "heavy";
}

export interface DomainNavigation {
    show_default_nav?: boolean;
    show_home?: boolean;
    show_kills?: boolean;
    show_wars?: boolean;
    show_battles?: boolean;
    show_campaigns?: boolean;
    show_stats?: boolean;
    show_tools?: boolean;
    show_search?: boolean;
    show_upload?: boolean;
    show_theme_toggle?: boolean;
    show_background_switcher?: boolean;
    show_info_menu?: boolean;
    show_user_menu?: boolean;
    sticky?: boolean;
    custom_links?: Array<{
        label: string;
        url: string;
        external: boolean;
        icon?: string;
        position: number;
        access_level: "public" | "members" | "admin";
        dropdown_items?: any[];
    }>;
}

export interface DomainPageConfig {
    layout?: "default" | "compact" | "detailed";
    components?: {
        recent_kills?: boolean;
        top_pilots?: boolean;
        campaigns?: boolean;
        battles?: boolean;
        stats_overview?: boolean;
        search_widget?: boolean;
        news_feed?: boolean;
        social_links?: boolean;
    };
    component_settings?: {
        recent_kills_count?: 5 | 10 | 20 | 50;
        top_pilots_count?: 5 | 10 | 15;
        time_range?: "24h" | "7d" | "30d" | "all";
        show_losses?: boolean;
        show_involved_kills?: boolean;
    };
}

export interface DomainFeatures {
    show_hero?: boolean;
    show_stats?: boolean;
    show_tracking_overview?: boolean;
    show_campaigns?: boolean;
    show_most_valuable?: boolean;
    show_top_boxes?: boolean;
    show_ship_analysis?: boolean;
    featured_campaign_id?: string;
}

export interface DomainEntity {
    entity_type: "character" | "corporation" | "alliance";
    entity_id: number;
    display_name?: string;
    show_in_nav?: boolean;
    primary?: boolean;
}

export interface DomainSettings {
    domain_id?: string;
    domain?: string;
    verified?: boolean;
    active?: boolean;
    entities?: DomainEntity[];
    branding?: DomainBranding;
    navigation?: DomainNavigation;
    page_config?: DomainPageConfig;
    features?: DomainFeatures;
}

export const useDomainSettingsStore = defineStore("domainSettings", () => {
    // State
    const currentDomain = ref<string | null>(null);
    const settings = ref<DomainSettings>({});
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const hasUnsavedChanges = ref(false);

    // Computed getters
    const isValid = computed(() => {
        return !!(settings.value.domain && settings.value.entities?.length);
    });

    const branding = computed(() => settings.value.branding || {});
    const navigation = computed(() => settings.value.navigation || {});
    const pageConfig = computed(() => settings.value.page_config || {});
    const features = computed(() => settings.value.features || {});
    const entities = computed(() => settings.value.entities || []);

    // Feature toggle getters (with proper defaults)
    const showHeroSection = computed(() => features.value.show_hero !== false);
    const showStatsSection = computed(
        () => features.value.show_stats !== false
    );
    const showTrackingOverview = computed(
        () => features.value.show_tracking_overview !== false
    );
    const showCampaignSection = computed(
        () => features.value.show_campaigns !== false
    );
    const showMostValuableSection = computed(
        () => features.value.show_most_valuable !== false
    );
    const showTopBoxesSection = computed(
        () => features.value.show_top_boxes !== false
    );
    const showShipAnalysisSection = computed(
        () => features.value.show_ship_analysis !== false
    );

    // Branding getters
    const domainTitle = computed(() => {
        return (
            branding.value.header_title ||
            `${currentDomain.value || "Custom"} Killboard`
        );
    });

    const customWelcomeMessage = computed(() => branding.value.welcome_message);
    const customSecondaryMessage = computed(
        () => branding.value.secondary_message
    );
    const customCTAButtons = computed(() => branding.value.cta_buttons || []);

    // Actions
    const loadDomainSettings = async (domain: string) => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await $fetch<{
                success: boolean;
                data: DomainSettings;
            }>(`/api/domains/lookup`, {
                query: { domain },
            });

            if (response.success && response.data) {
                currentDomain.value = domain;
                // Map the API response data correctly
                const domainData = response.data;
                settings.value = {
                    domain_id: domainData._id || domainData.domain_id,
                    domain: domainData.domain,
                    verified: domainData.verified,
                    active: domainData.active,
                    entities: domainData.entities || [],
                    branding: domainData.branding || {},
                    navigation: domainData.navigation || {},
                    page_config: domainData.page_config || {},
                    features: domainData.features || {},
                };
                hasUnsavedChanges.value = false;
            } else {
                throw new Error("Invalid domain configuration");
            }
        } catch (err: any) {
            error.value = err.message || "Failed to load domain settings";
            console.error("Failed to load domain settings:", err);
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const updateDomainSettings = async (
        domainId: string,
        updates: Partial<DomainSettings>
    ) => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await $fetch(`/api/user/domains/${domainId}`, {
                method: "PATCH",
                body: updates,
            });

            if (response.success) {
                // Merge updates into current settings
                settings.value = { ...settings.value, ...updates };
                hasUnsavedChanges.value = false;
                return response;
            } else {
                throw new Error("Failed to update domain settings");
            }
        } catch (err: any) {
            error.value = err.message || "Failed to update domain settings";
            console.error("Failed to update domain settings:", err);
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // Local state updates (for forms)
    const updateBranding = (brandingUpdates: Partial<DomainBranding>) => {
        settings.value.branding = {
            ...settings.value.branding,
            ...brandingUpdates,
        };
        hasUnsavedChanges.value = true;
    };

    const updateNavigation = (navigationUpdates: Partial<DomainNavigation>) => {
        settings.value.navigation = {
            ...settings.value.navigation,
            ...navigationUpdates,
        };
        hasUnsavedChanges.value = true;
    };

    const updatePageConfig = (pageConfigUpdates: Partial<DomainPageConfig>) => {
        settings.value.page_config = {
            ...settings.value.page_config,
            ...pageConfigUpdates,
        };
        hasUnsavedChanges.value = true;
    };

    const updateFeatures = (featureUpdates: Partial<DomainFeatures>) => {
        settings.value.features = {
            ...settings.value.features,
            ...featureUpdates,
        };
        hasUnsavedChanges.value = true;
    };

    const updateEntities = (entityUpdates: DomainEntity[]) => {
        settings.value.entities = entityUpdates;
        hasUnsavedChanges.value = true;
    };

    const resetSettings = () => {
        currentDomain.value = null;
        settings.value = {};
        isLoading.value = false;
        error.value = null;
        hasUnsavedChanges.value = false;
    };

    // Save changes to server
    const saveChanges = async () => {
        if (!settings.value.domain_id) {
            throw new Error("No domain ID available for saving");
        }

        return await updateDomainSettings(settings.value.domain_id, {
            branding: settings.value.branding,
            navigation: settings.value.navigation,
            page_config: settings.value.page_config,
            features: settings.value.features,
            entities: settings.value.entities,
        });
    };

    // Initialize from existing domain context or props
    const initializeFromData = (domainData: any) => {
        // Handle both direct domain data and API response format
        const data = domainData.data || domainData;

        settings.value = {
            domain_id: data._id || data.domain_id,
            domain: data.domain,
            verified: data.verified,
            active: data.active,
            entities: data.entities || [],
            branding: data.branding || {},
            navigation: data.navigation || {},
            page_config: data.page_config || {},
            features: data.features || {},
        };

        currentDomain.value = data.domain || null;
        hasUnsavedChanges.value = false;
    };

    return {
        // State
        currentDomain: readonly(currentDomain),
        settings: readonly(settings),
        isLoading: readonly(isLoading),
        error: readonly(error),
        hasUnsavedChanges: readonly(hasUnsavedChanges),

        // Computed
        isValid,
        branding,
        navigation,
        pageConfig,
        features,
        entities,

        // Feature toggles
        showHeroSection,
        showStatsSection,
        showTrackingOverview,
        showCampaignSection,
        showMostValuableSection,
        showTopBoxesSection,
        showShipAnalysisSection,

        // Branding
        domainTitle,
        customWelcomeMessage,
        customSecondaryMessage,
        customCTAButtons,

        // Actions
        loadDomainSettings,
        updateDomainSettings,
        updateBranding,
        updateNavigation,
        updatePageConfig,
        updateFeatures,
        updateEntities,
        resetSettings,
        saveChanges,
        initializeFromData,
    };
});
