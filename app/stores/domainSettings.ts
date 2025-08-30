import { defineStore } from "pinia";

// Flexible configuration interface - allows any key/value pairs
export interface FlexibleConfiguration {
    [key: string]: any;
    // Common examples:
    // primary_color?: string;
    // welcome_message?: string;
    // logo_url?: string;
    // show_hero?: boolean;
    // custom_font?: string;
    // theme_mode?: string;
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

export interface DomainDashboardTemplate {
    enabled?: boolean;
    html_template?: string;
    custom_css?: string;
    version?: number;
    created_at?: string;
    updated_at?: string;
}

export interface DomainEntity {
    entity_id: number;
    entity_type: "character" | "corporation" | "alliance";
    entity_name?: string;
    primary?: boolean;
}

export interface DomainSettings {
    domain?: string;
    owner_character_id?: number;
    verified?: boolean;
    active?: boolean;
    entities?: DomainEntity[];
    navigation?: DomainNavigation;
    configuration?: FlexibleConfiguration;
    dashboard_template?: DomainDashboardTemplate;
}

// Store definition
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

    // Computed getters for easy access to nested properties
    const entities = computed(() => settings.value.entities || []);
    const navigation = computed(() => settings.value.navigation || {});
    const configuration = computed(() => settings.value.configuration || {});
    const dashboardTemplate = computed(
        () => settings.value.dashboard_template || {}
    );

    // Navigation getters
    const showDefaultNav = computed(
        () => navigation.value.show_default_nav !== false
    );
    const customLinks = computed(() => navigation.value.custom_links || []);

    // Config getters - flexible configuration access
    const getConfigValue = (key: string, defaultValue?: any) => {
        return computed(() => configuration.value[key] ?? defaultValue);
    };

    // Dashboard Template getters
    const hasCustomDashboard = computed(
        () => dashboardTemplate.value.enabled === true
    );
    const customDashboardTemplate = computed(
        () => dashboardTemplate.value.html_template || ""
    );
    const customDashboardCSS = computed(
        () => dashboardTemplate.value.custom_css || ""
    );

    // Actions
    const loadDomainSettings = async (domain: string, forceRefresh = false) => {
        isLoading.value = true;
        error.value = null;

        // Log cache busting attempts
        if (forceRefresh) {
            console.log(
                `[Domain Settings Store] Force refreshing domain settings for: ${domain}`
            );
        }

        try {
            const queryParams: any = { domain };

            // Add cache busting parameter when forcing refresh
            if (forceRefresh) {
                queryParams._t = Date.now();
                queryParams.clearCache = "true"; // Also clear middleware cache
            }

            const response = await $fetch<{
                success: boolean;
                data: DomainSettings;
            }>(`/api/domains/lookup`, {
                query: queryParams,
                // Add timeout to prevent hanging requests
                timeout: 10000,
                // Disable caching for fetch requests
                ...(forceRefresh
                    ? {
                          server: false,
                          headers: { "Cache-Control": "no-cache" },
                      }
                    : {}),
            });

            if (response.success && response.data) {
                currentDomain.value = domain;
                // Map the API response data correctly
                const domainData = response.data;
                settings.value = {
                    domain: domainData.domain,
                    owner_character_id: domainData.owner_character_id,
                    verified: domainData.verified,
                    active: domainData.active,
                    entities: domainData.entities || [],
                    navigation: domainData.navigation || {},
                    configuration: domainData.configuration || {},
                    dashboard_template: domainData.dashboard_template || {},
                };
                hasUnsavedChanges.value = false;
            } else {
                throw new Error("Invalid domain configuration received");
            }
        } catch (err: any) {
            console.error(
                `[Domain Settings Store] Error loading settings for ${domain}:`,
                err
            );

            // Enhanced error handling with specific error types
            if (err.statusCode === 404) {
                error.value = "Domain not found";
            } else if (err.statusCode === 403) {
                error.value = "Domain not verified or not active";
            } else if (err.statusCode === 503) {
                error.value = "Domain is suspended";
            } else if (err.statusCode === 410) {
                error.value = "Domain has expired";
            } else if (err.statusCode === 400) {
                error.value = "Invalid domain parameter";
            } else if (err.name === "TimeoutError" || err.statusCode === 408) {
                error.value = "Request timeout - please try again";
            } else {
                error.value =
                    err.message ||
                    err.statusMessage ||
                    "Failed to load domain settings";
            }

            // Re-throw the error to let the calling component handle it
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
    const updateNavigation = (navigationUpdates: Partial<DomainNavigation>) => {
        settings.value.navigation = {
            ...settings.value.navigation,
            ...navigationUpdates,
        };
        hasUnsavedChanges.value = true;
    };

    const updateConfiguration = (
        configUpdates: Partial<FlexibleConfiguration>
    ) => {
        settings.value.configuration = {
            ...settings.value.configuration,
            ...configUpdates,
        };
        hasUnsavedChanges.value = true;
    };

    const updateEntities = (entityUpdates: DomainEntity[]) => {
        settings.value.entities = entityUpdates;
        hasUnsavedChanges.value = true;
    };

    const updateDashboardTemplate = (
        templateUpdates: Partial<DomainDashboardTemplate>
    ) => {
        settings.value.dashboard_template = {
            ...settings.value.dashboard_template,
            ...templateUpdates,
        };
        hasUnsavedChanges.value = true;
    };

    const resetSettings = () => {
        currentDomain.value = null;
        settings.value = {};
        isLoading.value = false;
        error.value = null;
        hasUnsavedChanges.value = false;
    };

    // Force refresh the current domain settings
    const refreshDomainSettings = async () => {
        if (!currentDomain.value) {
            throw new Error("No current domain to refresh");
        }

        console.log(
            `[Domain Settings Store] Force refreshing settings for ${currentDomain.value}`
        );

        // Clear cache manually by calling the cache clear API
        try {
            await $fetch(`/api/domains/cache/clear`, {
                query: {
                    domain: currentDomain.value,
                    comprehensive: "true",
                },
                timeout: 10000,
            });
            console.log(
                `[Domain Settings Store] Successfully cleared cache for ${currentDomain.value}`
            );
        } catch (cacheError) {
            console.warn(
                `[Domain Settings Store] Failed to clear cache:`,
                cacheError
            );
            // Continue anyway - the force refresh might still work
        }

        // Also trigger global cache key invalidation for components
        if (process.client) {
            try {
                // Direct cache key increment to avoid circular dependency
                const globalDomainCacheKey = useState<number>(
                    "domain-cache-key",
                    () => Date.now()
                );
                globalDomainCacheKey.value = Date.now();
                console.log(
                    `[Domain Settings Store] Incremented global cache key: ${globalDomainCacheKey.value}`
                );
            } catch (cacheError) {
                console.warn(
                    `[Domain Settings Store] Failed to increment cache key:`,
                    cacheError
                );
            }
        }

        await loadDomainSettings(currentDomain.value, true);
    };

    // Save changes to server
    const saveChanges = async () => {
        if (!settings.value.domain) {
            throw new Error("No domain available for saving");
        }

        const result = await updateDomainSettings(settings.value.domain, {
            navigation: settings.value.navigation,
            configuration: settings.value.configuration,
            entities: settings.value.entities,
            dashboard_template: settings.value.dashboard_template,
        });

        // After successful save, refresh the domain settings to ensure store is up to date
        if (currentDomain.value) {
            console.log(
                `[Domain Settings Store] Refreshing settings after save for ${currentDomain.value}`
            );
            await loadDomainSettings(currentDomain.value, true);
        }

        return result;
    };

    // Initialize from existing domain context or props
    const initializeFromData = (domainData: any) => {
        // Handle both direct domain data and API response format
        const data = domainData.data || domainData;

        settings.value = {
            domain: data.domain,
            owner_character_id: data.owner_character_id,
            verified: data.verified,
            active: data.active,
            entities: data.entities || [],
            navigation: data.navigation || {},
            configuration: data.configuration || {},
            dashboard_template: data.dashboard_template || {},
        };

        currentDomain.value = data.domain || null;
        hasUnsavedChanges.value = false;
    };

    // Initialize from SSR domain context (new SSR approach)
    const initializeFromDomainContext = (domainContext: any) => {
        if (!domainContext?.config) {
            console.warn("[Domain Settings Store] No domain config in context");
            return;
        }

        const config = domainContext.config;
        settings.value = {
            domain: config.domain,
            owner_character_id: config.owner_character_id,
            verified: config.verified,
            active: config.active,
            entities: config.entities || [],
            navigation: config.navigation || {},
            configuration: config.configuration || {},
            dashboard_template: config.dashboard_template || {},
        };

        currentDomain.value = config.domain || null;
        hasUnsavedChanges.value = false;

        console.log(
            `[Domain Settings Store] Initialized from domain context for: ${config.domain}`
        );
    };

    return {
        // State - expose original refs, not readonly wrappers
        currentDomain,
        settings,
        isLoading,
        error,
        hasUnsavedChanges,

        // Computed
        isValid,
        entities,
        navigation,
        configuration,
        dashboardTemplate,
        showDefaultNav,
        customLinks,

        // Dashboard Template
        hasCustomDashboard,
        customDashboardTemplate,
        customDashboardCSS,

        // Actions
        loadDomainSettings,
        updateDomainSettings,
        updateNavigation,
        updateConfiguration,
        updateEntities,
        updateDashboardTemplate,
        resetSettings,
        refreshDomainSettings,
        saveChanges,
        initializeFromData,
        initializeFromDomainContext,
    };
});
