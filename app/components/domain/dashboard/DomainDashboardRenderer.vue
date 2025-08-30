<template>
    <div class="domain-dashboard-renderer">
        <!-- Error State for Invalid Domains -->
        <div v-if="domainError" class="text-center py-16 px-4">
            <div class="max-w-md mx-auto">
                <div class="text-6xl mb-6">🚫</div>
                <h2 class="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                    Domain Not Found
                </h2>
                <div class="text-gray-600 dark:text-gray-400 mb-6">
                    {{ domainError }}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-500">
                    If you believe this is an error, please check that:
                    <ul class="list-disc list-inside mt-2 space-y-1">
                        <li>The domain is correctly configured</li>
                        <li>DNS settings are properly set up</li>
                        <li>The domain registration is active</li>
                    </ul>
                </div>
                <div class="mt-8">
                    <a href="/"
                        class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Go to EVE-KILL.com
                    </a>
                </div>
            </div>
        </div>

        <!-- Loading State -->
        <div v-else-if="!templateLoaded" class="text-center py-12">
            <div class="text-gray-500">Loading dashboard...</div>
        </div>

        <!-- Main Content -->
        <div v-else>
            <!-- Dynamic Template Rendering with Vue Components -->
            <div v-if="parsedTemplate && parsedTemplate.isValid" class="dynamic-template">
                <component :is="dynamicTemplate" />
            </div>

            <!-- Fallback Component Rendering (when dynamic template fails) -->
            <div v-else-if="parsedComponents.length > 0" class="vue-components">
                <template v-for="(comp, index) in parsedComponents" :key="`component-${index}`">
                    <component v-if="comp.component" :is="comp.component" v-bind="comp.props" :class="comp.classes"
                        @vue:error="onComponentError" />
                    <div v-else class="text-red-400 p-2">
                        Component not found: {{ comp.name }}
                    </div>
                </template>
            </div>

            <!-- HTML Template Rendering (final fallback) -->
            <div v-else-if="processedTemplate" class="html-template" v-html="processedTemplate" />

            <!-- Default Dashboard (when no template at all) -->
            <div v-else class="default-domain-dashboard">
                <div class="dashboard-header mb-8">
                    <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                        {{ currentDomain }} Dashboard
                    </h1>
                    <p class="text-gray-600 dark:text-gray-400">
                        Monitor combat operations and strategic achievements for {{ currentDomain }}
                    </p>
                </div>

                <!-- Stats Grid -->
                <div class="stats-grid mb-8">
                    <DomainDashboardStatsGrid :domain="currentDomain" :stats="stats" :time-range="timeRange" />
                </div>

                <!-- Most Valuable Kills -->
                <div v-if="stats?.mostValuableKills?.length > 0" class="most-valuable-section mb-8">
                    <h2 class="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Most Valuable Kills</h2>
                    <KillsMostValuable :kills="stats.mostValuableKills.slice(0, 6)" :show-header="false"
                        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" />
                </div>

                <!-- Top Ship Stats -->
                <div v-if="stats?.shipGroupStats?.length > 0" class="ship-stats-section mb-8">
                    <h2 class="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Ship Analysis</h2>
                    <KillsShipStats :stats="{ shipGroupStats: stats.shipGroupStats.slice(0, 10) }" :loading="false" />
                </div>

                <!-- Entities Overview -->
                <div class="entities-section mb-8">
                    <DomainDashboardTrackingOverview :domain="currentDomain" :entities="domainEntitiesWithNames" />
                </div>

                <!-- Recent Activity -->
                <div class="recent-activity">
                    <h2 class="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Recent Activity</h2>
                    <KillList :endpoint="killmailsEndpoint" :domain="currentDomain" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref, watch } from 'vue';
import { useDomainCacheInvalidation } from '~/composables/useDomainCacheInvalidation';
import { useDomainDashboardTemplate } from '~/composables/useDomainDashboardTemplate';
import type { DomainEntity } from './types';

// Initialize i18n at the top level of setup function
const { locale } = useI18n();
const currentLocale = computed(() => locale.value);

// Import dashboard components
import DomainDashboardTrackingOverview from './sections/DomainDashboardTrackingOverview.vue';
import DomainDashboardActiveEntitiesBox from './stats/DomainDashboardActiveEntitiesBox.vue';
import DomainDashboardISKDestroyedBox from './stats/DomainDashboardISKDestroyedBox.vue';
import DomainDashboardStatsGrid from './stats/DomainDashboardStatsGrid.vue';
import DomainDashboardTopShipBox from './stats/DomainDashboardTopShipBox.vue';
import DomainDashboardTotalKillsBox from './stats/DomainDashboardTotalKillsBox.vue';

// Import section components
import DomainDashboardCampaignsSection from './sections/DomainDashboardCampaignsSection.vue';
import DomainDashboardHeroSection from './sections/DomainDashboardHeroSection.vue';
import DomainDashboardMostValuableSection from './sections/DomainDashboardMostValuableSection.vue';
import DomainDashboardRecentActivitySection from './sections/DomainDashboardRecentActivitySection.vue';
import DomainDashboardShipAnalysisSection from './sections/DomainDashboardShipAnalysisSection.vue';
import DomainDashboardTimeRangeSelector from './sections/DomainDashboardTimeRangeSelector.vue';
import DomainDashboardTopBoxesSection from './sections/DomainDashboardTopBoxesSection.vue';

// Import existing components
import KillList from '../../common/KillList.vue';
import KillsMostValuable from '../../kills/KillsMostValuable.vue';
import KillsShipStats from '../../kills/KillsShipStats.vue';
import KillsTopBox from '../../kills/KillsTopBox.vue';


// Create component registry for dynamic resolution
const COMPONENT_REGISTRY = {
    // Stats components
    DomainDashboardActiveEntitiesBox,
    DomainDashboardISKDestroyedBox,
    DomainDashboardTopShipBox,
    DomainDashboardTotalKillsBox,

    // Section components
    DomainDashboardCampaignsSection,
    DomainDashboardHeroSection,
    DomainDashboardMostValuableSection,
    DomainDashboardRecentActivitySection,
    DomainDashboardShipAnalysisSection,
    DomainDashboardTimeRangeSelector,
    DomainDashboardTopBoxesSection,
    DomainDashboardTrackingOverview,

    // Other components
    KillList,
    KillsMostValuable,
    KillsShipStats,
    KillsTopBox,
} as const;

interface Props {
    domain: string
    timeRange?: '1d' | '7d' | '14d' | '30d'
    customCss?: string
    customTemplate?: string
    fallbackToDefault?: boolean
    clientOnly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    timeRange: '7d',
    customCss: '',
    customTemplate: '',
    fallbackToDefault: true,
    clientOnly: false
})

// Use Nuxt's useState for proper SSR/client state sharing
const domainContext = useState<any>('domain-context', () => {
    // During SSR, initialize from event context
    if (process.server) {
        const event = useRequestEvent()
        return event?.context?.domainContext || null
    }
    // On client, this will be hydrated from server state
    return null
})

// Use Nuxt's useState for template state as well
const customTemplate = useState<string>('domain-template', () => '')
const customCss = useState<string>('domain-css', () => '')
const templateLoaded = useState<boolean>('template-loaded', () => false)


const domainError = ref<string | null>(null)

// Validate domain context - focus on template loading success rather than domain context
watch([domainContext, templateLoaded], ([context, loaded]) => {
    if (loaded && !context) {
        // Template loaded successfully but no domain context - this is OK for SSR
        domainError.value = null
    } else if (context?.error) {
        domainError.value = context.error.message
    } else {
        domainError.value = null
    }
}, { immediate: false })

// Don't show domain context errors if template is working
watch(templateLoaded, (loaded) => {
    if (loaded && domainError.value === 'Domain context not available') {
        domainError.value = null
    }
})

// Get entities from domain context (SSR-available)
const domainEntities = computed(() => {
    if (!domainContext.value?.entities) return []

    return domainContext.value.entities.map((entity: any) => {
        // Determine entity type and ID based on available properties
        let entityType: "character" | "corporation" | "alliance";
        let entityId: number;
        let entityName: string;

        if (entity.alliance_id) {
            entityType = "alliance";
            entityId = entity.alliance_id;
            entityName = entity.name || entity.ticker || `Alliance ${entity.alliance_id}`;
        } else if (entity.corporation_id) {
            entityType = "corporation";
            entityId = entity.corporation_id;
            entityName = entity.name || entity.ticker || `Corporation ${entity.corporation_id}`;
        } else if (entity.character_id) {
            entityType = "character";
            entityId = entity.character_id;
            entityName = entity.name || `Character ${entity.character_id}`;
        } else {
            // Fallback - try to determine from _entityConfig
            entityType = entity._entityConfig?.entity_type || "character";
            entityId = entity._entityConfig?.entity_id || entity._id;
            entityName = entity.name || entity.display_name || `${entityType} ${entityId}`;
        }

        // Generate image URL based on entity type
        let imageUrl: string | undefined;
        if (entityType === "character") {
            imageUrl = `https://images.evetech.net/characters/${entityId}/portrait?size=64`;
        } else if (entityType === "corporation") {
            imageUrl = `https://images.evetech.net/corporations/${entityId}/logo?size=64`;
        } else if (entityType === "alliance") {
            imageUrl = `https://images.evetech.net/alliances/${entityId}/logo?size=64`;
        }

        return {
            entity_id: entityId,
            entity_type: entityType,
            name: entityName,
            display_name: entity.display_name || entityName,
            image_url: imageUrl,
            primary: entity.primary || false,
            show_in_nav: entity.show_in_nav !== false, // Default to true unless explicitly false
            show_in_stats: entity.show_in_stats !== false, // Default to true unless explicitly false
            missing: entity.missing || false
        } as DomainEntity;
    })
})

// Domain cache invalidation composable
const { getCacheBustedKey } = useDomainCacheInvalidation();

// Time range state
const selectedTimeRange = ref(props.timeRange)

// Query parameters for stats API
const statsQueryParams = computed(() => ({
    timeRange: selectedTimeRange.value
}))

// Fetch key for stats with cache busting
const statsFetchKey = computed(() => {
    return getCacheBustedKey(`domain-stats-${currentDomain.value}-${selectedTimeRange.value}-all-all`);
});

// Fetch domain stats using useFetch (SSR)
const currentDomain = computed(() => {
    // Use props.domain if available, otherwise try to get from domain context or current hostname
    if (props.domain) {
        return props.domain;
    }

    // Try to get domain from context
    if (domainContext.value?.domain) {
        return domainContext.value.domain;
    }

    // Fallback to current hostname (client-side only)
    if (process.client && typeof window !== 'undefined') {
        return window.location.hostname;
    }

    return '';
});

// Check if we have a valid domain context or if this is a known domain
const shouldFetchStats = computed(() => {
    // Only fetch stats if we have a domain AND either:
    // 1. We have a valid domain context (verified domain)
    // 2. This is a fallback scenario with clientOnly prop
    return !!(currentDomain.value && (domainContext.value?.domain || props.clientOnly));
});

const statsUrl = computed(() =>
    shouldFetchStats.value ? `/api/domain/${currentDomain.value}/stats` : ''
);

const {
    data: stats,
    pending: statsLoading,
    error: statsError,
    refresh: refreshStats
} = await useFetch<any>(
    statsUrl,
    {
        key: statsFetchKey,
        query: statsQueryParams,
        server: true,
        lazy: false,
        default: () => ({}),
        onResponseError({ request, response, options }) {
            // Don't log errors for invalid domains (404s are expected)
            if (response.status !== 404) {
                console.error('[DomainDashboardRenderer] Stats API Error:', {
                    url: request,
                    status: response.status,
                    error: response._data
                });
            }
        }
    }
);

// Fetch domain entities using useFetch (SSR) - only if we have a valid domain
const entitiesUrl = computed(() =>
    shouldFetchStats.value ? `/api/domain/${currentDomain.value}/entities` : ''
);
const {
    data: domainEntitiesResponse,
    pending: entitiesLoading,
    error: entitiesError,
    refresh: refreshEntities
} = await useFetch<any>(
    entitiesUrl,
    {
        key: computed(() => {
            return getCacheBustedKey(`domain-entities-${currentDomain.value}`);
        }),
        server: true,
        lazy: false,
        default: () => ({ success: false, entities: [] }),
        onResponseError({ response }) {
            // Don't log errors for invalid domains (404s are expected)
            if (response.status !== 404) {
                console.error('[DomainDashboardRenderer] Entities API Error:', response.status);
            }
        }
    }
);

// Computed domain entities with names (merge context and API data)
const domainEntitiesWithNames = computed(() => {
    // Prefer API response if available, fallback to domain context
    if (domainEntitiesResponse.value?.success && domainEntitiesResponse.value?.entities?.length > 0) {
        return domainEntitiesResponse.value.entities;
    }
    return domainEntities.value;
});

// Fetch domain campaigns using useFetch (SSR) - only if we have a valid domain
const campaignsUrl = computed(() =>
    shouldFetchStats.value ? `/api/domain/${currentDomain.value}/campaigns` : ''
);
const {
    data: campaignsResponse,
    pending: campaignsLoading,
    error: campaignsError
} = await useFetch<any>(
    campaignsUrl,
    {
        key: computed(() => {
            return getCacheBustedKey(`domain-campaigns-${currentDomain.value}`);
        }),
        query: { limit: 10 },
        server: true,
        lazy: false,
        default: () => ({ success: false, campaigns: [] }),
        onResponseError({ response }) {
            // Don't log errors for invalid domains (404s are expected)
            if (response.status !== 404) {
                console.error('[DomainDashboardRenderer] Campaigns API Error:', response.status);
            }
        }
    }
);

// Computed domain campaigns
const domainCampaigns = computed(() => {
    if (campaignsResponse.value?.campaigns) {
        return campaignsResponse.value.campaigns;
    }
    return [];
});

// Entity stats for showcase
const entityStats = computed(() => {
    const statsMap: Record<string, any> = {};

    if (stats.value?.entityBreakdown) {
        for (const entityStat of stats.value.entityBreakdown) {
            statsMap[entityStat.entity_id] = {
                kills: entityStat.kills,
                value: entityStat.total_value,
                recent_activity: entityStat.last_activity &&
                    new Date(entityStat.last_activity) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24h
            };
        }
    }

    return statsMap;
});

// Statistics helpers
const topShipDestroyed = computed(() => {
    const shipStat = stats.value?.shipGroupStats?.[0];
    if (!shipStat) return null;

    return {
        ...shipStat,
        ship_group_name: getLocalizedString(shipStat.ship_group_name, currentLocale.value)
    };
});

// Helper function
const getLocalizedString = (obj: any, locale: string): string => {
    if (!obj) return "";
    return obj[locale] || obj.en || "";
};

// Domain killmails endpoint for KillList component
const killmailsEndpoint = computed(() => {
    if (!currentDomain.value) return '/api/killlist';

    const params = new URLSearchParams({
        timeRange: selectedTimeRange.value
    });

    return `/api/domain/${currentDomain.value}/killmails?${params.toString()}`;
});

// Helper functions
const numberFormat = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

const formatIsk = (value: number): string => {
    if (value >= 1e12) return (value / 1e12).toFixed(1) + 'T';
    if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
    if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
    return value.toFixed(0);
};

const getTimeRangeLabel = (range: string) => {
    return range; // Just return the range value (1d, 7d, etc.)
};

// Default welcome message
const defaultWelcomeMessage = computed(() => {
    const entityCount = domainEntitiesWithNames.value.length;
    const entityTypes = [...new Set(domainEntitiesWithNames.value.map((e: any) => e._entityConfig?.entity_type || e.entity_type))];

    if (entityCount === 0) {
        return "Welcome to this EVE Online killboard. Track combat activity, analyze statistics, and monitor space battles.";
    }

    if (entityCount === 1) {
        const entity = domainEntitiesWithNames.value[0];
        return `Welcome to the official killboard for ${entity.display_name || `${entity._entityConfig?.entity_type || entity.entity_type} ${entity._entityConfig?.entity_id || entity.entity_id}`}. Monitor our combat operations and strategic achievements in New Eden.`;
    }

    return `Unified killboard tracking ${entityCount} ${entityTypes.join(', ')} entities. Monitor multi-entity operations, alliance coordination, and strategic combat statistics across New Eden.`;
});

// Initialize template immediately if available from domain context
const initializeTemplate = () => {
    const context = domainContext.value;

    // If domain has an error, mark as loaded to show error state
    if (context?.error) {
        templateLoaded.value = true;
        return true;
    }

    if (context?.dashboardTemplate) {
        customTemplate.value = context.dashboardTemplate.template || '';
        customCss.value = context.dashboardTemplate.customCss || '';
        templateLoaded.value = true;
        return true;
    }
    return false;
};

// Initialize during SSR and maintain consistency
if (process.server) {
    const initialized = initializeTemplate();
    if (!initialized) {
        templateLoaded.value = true;
    }
}

// Only use onMounted for API fallback if no template was loaded during SSR
onMounted(async () => {
    // If we have a domain error, mark as loaded to show error state
    if (domainError.value) {
        templateLoaded.value = true;
        return;
    }

    // If we already have template data from SSR, we're good
    if (customTemplate.value || templateLoaded.value) {
        return;
    }

    // Final fallback to API if no template available and domain is valid
    try {
        const { loadTemplate } = useDomainDashboardTemplate();
        const templateData = await loadTemplate(currentDomain.value);
        if (templateData) {
            customTemplate.value = templateData.template;
            customCss.value = templateData.customCss;
        }
        templateLoaded.value = true;
    } catch (error) {
        console.error('[DomainDashboardRenderer] Failed to load template:', error);
        templateLoaded.value = true; // Prevent infinite loading
    }
});

// Watch for domain context changes (useful for client-side updates)
watch(domainContext, (newContext) => {
    if (newContext?.dashboardTemplate && !templateLoaded.value) {
        initializeTemplate();
    }
});

// Watch for prop changes (for live editing)
watch(() => props.customTemplate, (newTemplate) => {
    if (newTemplate !== undefined) {
        customTemplate.value = newTemplate;
    }
});

watch(() => props.customCss, (newCss) => {
    if (newCss !== undefined) {
        customCss.value = newCss;
    }
});

// Parse components from the template using the composable
const { parseTemplate } = useDomainDashboardTemplate();

// Parse the template for Vue components
const parsedTemplate = computed(() => {
    const template = customTemplate.value;
    if (!template || typeof template !== 'string') return null;
    const result = parseTemplate(template);
    return result;
});

// Extract parsed components and resolve them to Vue components
const parsedComponents = computed(() => {
    const parsed = parsedTemplate.value;
    if (!parsed || !parsed.isValid) {
        return [];
    }

    // Create context for evaluating dynamic expressions
    const context = {
        domain: currentDomain.value,
        timeRange: selectedTimeRange.value,
        selectedTimeRange: selectedTimeRange.value,
        selectedTimeRangeDays: computed(() => {
            const range = selectedTimeRange.value;
            if (range === '1d') return 1;
            if (range === '7d') return 7;
            if (range === '30d') return 30;
            if (range === '90d') return 90;
            return 7; // default
        }).value,
        entities: domainEntitiesWithNames.value,
        entityStats: entityStats.value,
        campaigns: domainCampaigns.value,
        stats: stats.value,
        currentLocale: currentLocale.value,
        loading: statsLoading.value || entitiesLoading.value || campaignsLoading.value,
        statsLoading: statsLoading.value,
        entitiesLoading: entitiesLoading.value,
        campaignsLoading: campaignsLoading.value,
        killmailsEndpoint: killmailsEndpoint.value,
        welcomeMessage: defaultWelcomeMessage.value,
        topShipDestroyed: topShipDestroyed.value
    };

    return parsed.components.map((comp: any) => {
        // Resolve component name to actual Vue component
        const componentName = comp.name as keyof typeof COMPONENT_REGISTRY;
        const resolvedComponent = COMPONENT_REGISTRY[componentName];

        // Evaluate dynamic props
        const evaluatedProps: Record<string, any> = {};

        for (const [key, value] of Object.entries(comp.props || {})) {
            if (typeof value === 'string') {
                // Check if it's a direct context property reference
                if (value in context) {
                    evaluatedProps[key] = (context as any)[value];
                } else {
                    // Handle different expression patterns - create a comprehensive replacement
                    let evaluatedValue = value;

                    // Replace all known variables with their actual values
                    const replacements = {
                        'selectedTimeRange': `"${selectedTimeRange.value}"`,
                        'selectedTimeRangeDays': context.selectedTimeRangeDays.toString(),
                        'domain': `"${currentDomain.value}"`,
                        'entities': 'context.entities',
                        'entityStats': 'context.entityStats',
                        'campaigns': 'context.campaigns',
                        'stats': 'context.stats',
                        'currentLocale': `"${currentLocale.value}"`,
                        'loading': context.loading.toString(),
                        'statsLoading': context.statsLoading.toString(),
                        'entitiesLoading': context.entitiesLoading.toString(),
                        'campaignsLoading': context.campaignsLoading.toString(),
                        'killmailsEndpoint': `"${killmailsEndpoint.value}"`,
                        'welcomeMessage': `"${defaultWelcomeMessage.value}"`,
                        'topShipDestroyed': 'context.topShipDestroyed'
                    };

                    // Apply replacements
                    for (const [varName, replacement] of Object.entries(replacements)) {
                        const regex = new RegExp(`\\b${varName}\\b`, 'g');
                        evaluatedValue = evaluatedValue.replace(regex, replacement);
                    }

                    // Try to evaluate complex expressions
                    if (evaluatedValue.includes('?.') || evaluatedValue.includes('||') || evaluatedValue.includes('.slice(') || evaluatedValue.includes('context.') || evaluatedValue !== value) {
                        try {
                            // Only use Function constructor on client-side for safety
                            if (process.client && typeof window !== 'undefined') {
                                // Create a safe evaluation function
                                const func = new Function('context', `
                                    with (context) {
                                        try {
                                            return ${evaluatedValue};
                                        } catch (e) {
                                            console.warn('[DomainDashboardRenderer] Expression evaluation failed:', '${evaluatedValue}', e);
                                            return undefined;
                                        }
                                    }
                                `);
                                const result = func(context);
                                evaluatedProps[key] = result !== undefined ? result : value;
                            } else {
                                // Server-side: Handle specific common patterns manually for safety
                                if (evaluatedValue.includes('context.stats?.mostValuableKills?.slice(0, 7) || []') ||
                                    evaluatedValue.includes('stats?.mostValuableKills?.slice(0, 7) || []')) {
                                    // Handle the most valuable kills expression specifically
                                    const statsData = context.stats;
                                    if (statsData && statsData.mostValuableKills && Array.isArray(statsData.mostValuableKills)) {
                                        evaluatedProps[key] = statsData.mostValuableKills.slice(0, 7);
                                    } else {
                                        evaluatedProps[key] = [];
                                    }
                                } else if (evaluatedValue.includes('context.stats?.topKillersByCharacter || []') ||
                                    evaluatedValue.includes('stats?.topKillersByCharacter || []')) {
                                    const statsData = context.stats;
                                    evaluatedProps[key] = (statsData && statsData.topKillersByCharacter) ? statsData.topKillersByCharacter : [];
                                } else if (evaluatedValue.includes('context.stats?.topKillersByCorporation || []') ||
                                    evaluatedValue.includes('stats?.topKillersByCorporation || []')) {
                                    const statsData = context.stats;
                                    evaluatedProps[key] = (statsData && statsData.topKillersByCorporation) ? statsData.topKillersByCorporation : [];
                                } else if (evaluatedValue.includes('context.stats?.topKillersByAlliance || []') ||
                                    evaluatedValue.includes('stats?.topKillersByAlliance || []')) {
                                    const statsData = context.stats;
                                    evaluatedProps[key] = (statsData && statsData.topKillersByAlliance) ? statsData.topKillersByAlliance : [];
                                } else if (evaluatedValue.includes('context.')) {
                                    // Extract context property references
                                    const contextMatch = evaluatedValue.match(/context\.(\w+)/);
                                    if (contextMatch && contextMatch[1] in context) {
                                        evaluatedProps[key] = (context as any)[contextMatch[1]];
                                    } else {
                                        evaluatedProps[key] = [];  // Default to empty array for safety
                                    }
                                } else {
                                    evaluatedProps[key] = [];  // Default to empty array for complex expressions during SSR
                                }
                            }
                        } catch (e) {
                            console.warn('[DomainDashboardRenderer] Failed to evaluate expression:', evaluatedValue, e);
                            evaluatedProps[key] = [];  // Default to empty array to prevent .slice errors
                        }
                    } else {
                        // Regular string prop
                        evaluatedProps[key] = value;
                    }
                }
            } else {
                // Non-string props (numbers, booleans, objects)
                evaluatedProps[key] = value;
            }
        }

        return {
            component: resolvedComponent || null,
            props: evaluatedProps,
            classes: comp.classes || '',
            name: comp.name
        };
    });
});

// Dynamic template compiler - converts HTML template with Vue components into renderable Vue template
const dynamicTemplate = computed(() => {
    if (!parsedTemplate.value || !parsedTemplate.value.isValid) {
        return null;
    }

    // Since runtime template compilation isn't available, we'll fall back to the component-only approach
    // but ensure we have a proper grid layout wrapper
    return defineComponent({
        name: 'DynamicDashboardTemplate',
        setup() {
            return {
                parsedComponents: parsedComponents.value
            };
        },
        render() {
            // Create a wrapper div with the grid layout for the metric boxes
            const heroSection = parsedComponents.value.find(comp => comp.name === 'DomainDashboardHeroSection');
            const timeRangeSelector = parsedComponents.value.find(comp => comp.name === 'DomainDashboardTimeRangeSelector');
            const metricBoxes = parsedComponents.value.filter(comp =>
                ['DomainDashboardTotalKillsBox', 'DomainDashboardISKDestroyedBox', 'DomainDashboardTopShipBox', 'DomainDashboardActiveEntitiesBox'].includes(comp.name)
            );
            const recentActivitySection = parsedComponents.value.find(comp => comp.name === 'DomainDashboardRecentActivitySection');
            const topBoxesSection = parsedComponents.value.find(comp => comp.name === 'DomainDashboardTopBoxesSection');
            const middleComponents = parsedComponents.value.filter(comp =>
                !['DomainDashboardHeroSection', 'DomainDashboardTimeRangeSelector', 'DomainDashboardTotalKillsBox', 'DomainDashboardISKDestroyedBox', 'DomainDashboardTopShipBox', 'DomainDashboardActiveEntitiesBox', 'DomainDashboardRecentActivitySection', 'DomainDashboardTopBoxesSection'].includes(comp.name)
            );

            const children = [];

            // Hero section first
            if (heroSection) {
                children.push(h(heroSection.component, heroSection.props));
            }

            // Main dashboard content wrapper
            children.push(h('div', { class: 'dashboard-container' }, [
                // Time range selector
                timeRangeSelector ? h('div', { class: 'time-range-section' }, [
                    h(timeRangeSelector.component, timeRangeSelector.props)
                ]) : null,

                // Statistics grid - 4 metric boxes in a row
                h('div', { class: 'metrics-grid' },
                    metricBoxes.map(comp =>
                        h('div', { class: 'metrics-grid-item' }, [
                            h(comp.component, { ...comp.props, class: 'metric-box' })
                        ])
                    )
                ),

                // Middle sections (tracking, campaigns, most valuable, ship analysis)
                ...middleComponents.map(comp =>
                    h('div', { class: 'dashboard-section' }, [
                        h(comp.component, comp.props)
                    ])
                ),

                // Bottom section - 80/20 split (kill list + top boxes)
                (recentActivitySection || topBoxesSection) ? h('div', { class: 'bottom-grid' }, [
                    // Kill list section (80% width)
                    recentActivitySection ? h('div', { class: 'kill-list-section' }, [
                        h(recentActivitySection.component, recentActivitySection.props)
                    ]) : null,

                    // Top boxes section (20% width)
                    topBoxesSection ? h('div', { class: 'top-boxes-section' }, [
                        h(topBoxesSection.component, topBoxesSection.props)
                    ]) : null
                ].filter(Boolean)) : null
            ]));

            return h('div', children.filter(Boolean));
        }
    });
});

// Process template for HTML rendering (when no Vue components are detected)
const processedTemplate = computed(() => {
    const template = customTemplate.value;
    if (!template || typeof template !== 'string') return '';

    // Handle variable substitution manually
    let processed = template;
    processed = processed.replace(/\{\{\s*domain\s*\}\}/g, currentDomain.value);
    processed = processed.replace(/\{\{\s*timeRange\s*\}\}/g, props.timeRange || '7d');

    return processed;
});

// Error handler for component rendering errors
const onComponentError = (error: any, componentName?: string) => {
    console.error(`[DomainDashboardRenderer] Component error${componentName ? ` in ${componentName}` : ''}:`, error)
    // Don't throw - just log the error to prevent cascading failures
}

// CSS injection using useHead with style.textContent for proper SSR support
const cssToInject = computed(() => {
    const css = props.customCss || customCss.value;
    return css && css.trim() ? css : null;
});

// Use Nuxt's useHead with style.textContent for proper SSR CSS injection
watch(cssToInject, (css) => {
    if (css) {
        useHead({
            style: [{
                textContent: css,
                key: 'domain-dashboard-custom-css'
            }]
        });
    }
}, { immediate: true });
</script>

<style scoped>
.vue-components {
    width: 100%;
}

.html-fallback {
    width: 100%;
}

.default-fallback {
    width: 100%;
}
</style>
