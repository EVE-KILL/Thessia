import {
    type IConfiguration,
    type IResolvedConfiguration,
    ConfigurationPriority,
} from "../../server/interfaces/IConfiguration";

export interface ConfigurationState {
    /** Cached configurations for the current user context */
    configurations: Map<string, IResolvedConfiguration>;

    /** Loading state for configuration operations */
    loading: boolean;

    /** Current user context for configuration resolution */
    context: {
        characterId?: number | null;
        corporationId?: number | null;
        allianceId?: number | null;
    };
}

/**
 * Pinia store for managing user configurations
 */
export const useConfigurationStore = defineStore("configuration", () => {
    // State
    const configurations = ref<Map<string, IResolvedConfiguration>>(new Map());
    const loading = ref(false);
    const context = ref<ConfigurationState["context"]>({});

    // Getters
    const getConfiguration = computed(() => {
        return (key: string, defaultValue?: any): any => {
            const config = configurations.value.get(key);
            return config?.value ?? defaultValue;
        };
    });

    const hasConfiguration = computed(() => {
        return (key: string): boolean => {
            return configurations.value.has(key);
        };
    });

    const getConfigurationWithMeta = computed(() => {
        return (key: string): IResolvedConfiguration | null => {
            return configurations.value.get(key) ?? null;
        };
    });

    // Actions

    /**
     * Set the current user context for configuration resolution
     */
    const setContext = (newContext: ConfigurationState["context"]) => {
        context.value = newContext;
    };

    /**
     * Load all configurations for the current context
     */
    const loadConfigurations = async () => {
        if (
            !context.value.characterId &&
            !context.value.corporationId &&
            !context.value.allianceId
        ) {
            return;
        }

        loading.value = true;

        try {
            const data = await $fetch<{ configurations: IConfiguration[] }>(
                "/api/configurations",
                {
                    query: {
                        characterId: context.value.characterId,
                        corporationId: context.value.corporationId,
                        allianceId: context.value.allianceId,
                    },
                }
            );

            // Clear existing configurations
            configurations.value.clear();

            // Process configurations with priority resolution
            const resolvedConfigs = resolveConfigurationPriority(
                data.configurations
            );

            resolvedConfigs.forEach((config) => {
                configurations.value.set(config.key, config);
            });
        } catch (error) {
            console.error("Failed to load configurations:", error);
        } finally {
            loading.value = false;
        }
    };

    /**
     * Set a configuration value
     */
    const setConfiguration = async (
        key: string,
        value: any,
        options: {
            characterId?: number | null;
            corporationId?: number | null;
            allianceId?: number | null;
            all?: boolean;
        } = {}
    ) => {
        loading.value = true;

        try {
            const data = await $fetch<{ configuration: IConfiguration }>(
                "/api/configurations",
                {
                    method: "POST",
                    body: {
                        key,
                        value,
                        ...options,
                    },
                }
            );

            // Determine priority and source for the new configuration
            const priority = determinePriority(data.configuration);
            const resolvedConfig: IResolvedConfiguration = {
                key: data.configuration.key,
                value: data.configuration.value,
                priority,
                source: {
                    characterId: data.configuration.characterId,
                    corporationId: data.configuration.corporationId,
                    allianceId: data.configuration.allianceId,
                    all: data.configuration.all,
                },
            };

            // Update local cache with priority consideration
            const existing = configurations.value.get(key);
            if (!existing || priority <= existing.priority) {
                configurations.value.set(key, resolvedConfig);
            }
        } catch (error) {
            console.error("Failed to set configuration:", error);
            throw error;
        } finally {
            loading.value = false;
        }
    };

    /**
     * Delete a configuration
     */
    const deleteConfiguration = async (
        key: string,
        options: {
            characterId?: number | null;
            corporationId?: number | null;
            allianceId?: number | null;
            all?: boolean;
        } = {}
    ) => {
        loading.value = true;

        try {
            await $fetch("/api/configurations", {
                method: "DELETE",
                body: {
                    key,
                    ...options,
                },
            });

            // Reload configurations to ensure proper priority resolution
            await loadConfigurations();
        } catch (error) {
            console.error("Failed to delete configuration:", error);
            throw error;
        } finally {
            loading.value = false;
        }
    };

    /**
     * Clear all cached configurations
     */
    const clearConfigurations = () => {
        configurations.value.clear();
    };

    /**
     * Refresh configurations from the server
     */
    const refreshConfigurations = async () => {
        await loadConfigurations();
    };

    // Helper functions

    /**
     * Resolve configuration priority when multiple configurations exist for the same key
     */
    const resolveConfigurationPriority = (
        configs: IConfiguration[]
    ): IResolvedConfiguration[] => {
        const configMap = new Map<string, IResolvedConfiguration>();

        configs.forEach((config) => {
            const priority = determinePriority(config);
            const resolvedConfig: IResolvedConfiguration = {
                key: config.key,
                value: config.value,
                priority,
                source: {
                    characterId: config.characterId,
                    corporationId: config.corporationId,
                    allianceId: config.allianceId,
                    all: config.all,
                },
            };

            const existing = configMap.get(config.key);
            if (!existing || priority < existing.priority) {
                configMap.set(config.key, resolvedConfig);
            }
        });

        return Array.from(configMap.values());
    };

    /**
     * Determine the priority of a configuration based on its scope
     */
    const determinePriority = (
        config: IConfiguration
    ): ConfigurationPriority => {
        if (config.characterId) return ConfigurationPriority.CHARACTER;
        if (config.corporationId) return ConfigurationPriority.CORPORATION;
        if (config.allianceId) return ConfigurationPriority.ALLIANCE;
        if (config.all) return ConfigurationPriority.ALL;
        return ConfigurationPriority.ALL; // fallback
    };

    return {
        // State - expose original refs, not readonly wrappers
        configurations,
        loading,
        context,

        // Getters
        getConfiguration,
        hasConfiguration,
        getConfigurationWithMeta,

        // Actions
        setContext,
        loadConfigurations,
        setConfiguration,
        deleteConfiguration,
        clearConfigurations,
        refreshConfigurations,
    };
});
