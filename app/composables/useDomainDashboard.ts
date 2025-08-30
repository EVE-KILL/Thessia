import type {
    DomainDashboardComponentProps,
    DomainDashboardStats,
} from "~/components/domain/dashboard/types";

/**
 * Shared composable for domain dashboard components
 * Provides common functionality like data fetching, formatting, and state management
 */
export const useDomainDashboard = (props: DomainDashboardComponentProps) => {
    const { t, locale } = useI18n();
    const currentLocale = computed(() => locale.value);

    // Get domain context for additional configuration
    const { customDomain, features } = useDomainContext();

    // Cache invalidation system
    const { getCacheBustedKey } = useDomainCacheInvalidation();

    // Computed domain for API calls
    const currentDomain = computed(() => props.domain || customDomain.value);

    // Query parameters for stats API
    const statsQueryParams = computed(() => ({
        timeRange: props.timeRange || "7d",
        ...(props.entityFilter
            ? {
                  entityType: props.entityFilter.type,
                  entityId: props.entityFilter.id.toString(),
              }
            : {}),
    }));

    // Fetch key for stats with cache busting
    const statsFetchKey = computed(() => {
        return getCacheBustedKey(
            `domain-stats-${currentDomain.value}-${props.timeRange || "7d"}-${
                props.entityFilter?.type || "all"
            }-${props.entityFilter?.id || "all"}`
        );
    });

    // Fetch domain stats
    const shouldFetchStats = computed(
        () => !!currentDomain.value && !props.data
    );
    const {
        data: stats,
        pending: statsLoading,
        error: statsError,
        refresh: refreshStats,
    } = useLazyFetch<DomainDashboardStats>(
        () =>
            shouldFetchStats.value
                ? `/api/domain/${currentDomain.value}/stats`
                : null,
        {
            key: statsFetchKey,
            query: statsQueryParams,
            server: true,
            default: () => ({} as DomainDashboardStats),
        }
    );

    // Use provided data if available, otherwise use fetched data
    const componentData = computed(() => {
        return props.data || stats.value || {};
    });

    // Loading state - use props override or actual loading state
    const isLoading = computed(() => {
        return props.loading !== undefined ? props.loading : statsLoading.value;
    });

    // Helper functions for formatting
    const formatNumber = (num: number): string => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
        if (num >= 1000) return (num / 1000).toFixed(1) + "K";
        return num.toString();
    };

    const formatIsk = (value: number): string => {
        if (value >= 1e12) return (value / 1e12).toFixed(1) + "T";
        if (value >= 1e9) return (value / 1e9).toFixed(1) + "B";
        if (value >= 1e6) return (value / 1e6).toFixed(1) + "M";
        if (value >= 1e3) return (value / 1e3).toFixed(1) + "K";
        return value.toFixed(0);
    };

    const getLocalizedString = (obj: any, locale: string): string => {
        if (!obj) return "";
        if (typeof obj === "string") return obj;
        return obj[locale] || obj.en || "";
    };

    const getTimeRangeLabel = (range: string) => {
        const timeRanges = {
            "1d": "1 day",
            "7d": "7 days",
            "14d": "14 days",
            "30d": "30 days",
        };
        return timeRanges[range as keyof typeof timeRanges] || range;
    };

    const getTimeRangeDays = (range: string): number => {
        switch (range) {
            case "1d":
                return 1;
            case "7d":
                return 7;
            case "14d":
                return 14;
            case "30d":
                return 30;
            default:
                return 7;
        }
    };

    // Component styling helpers
    const componentClasses = computed(() => {
        const baseClasses = "domain-dashboard-component";
        const customClasses = props.customClass || "";
        return [baseClasses, customClasses].filter(Boolean).join(" ");
    });

    const componentStyles = computed(() => {
        return props.customStyles || {};
    });

    return {
        // Data
        componentData,
        stats,
        isLoading,
        statsError,

        // Computed values
        currentDomain,
        currentLocale,
        componentClasses,
        componentStyles,

        // Helper functions
        formatNumber,
        formatIsk,
        getLocalizedString,
        getTimeRangeLabel,
        getTimeRangeDays,

        // Actions
        refreshStats,

        // Reactive refs for advanced use cases
        statsQueryParams,
    };
};

/**
 * Composable specifically for domain entity data
 */
export const useDomainEntities = (domain: string) => {
    const { getCacheBustedKey } = useDomainCacheInvalidation();

    const {
        data: entitiesResponse,
        pending: entitiesLoading,
        error: entitiesError,
        refresh: refreshEntities,
    } = useLazyFetch(
        () => (domain ? `/api/domain/${domain}/entities` : undefined),
        {
            key: getCacheBustedKey(`domain-entities-${domain}`),
            server: true,
            default: () => ({ success: false, entities: [] }),
        }
    );

    const entities = computed(() => {
        if (
            entitiesResponse.value?.success &&
            entitiesResponse.value?.entities
        ) {
            return entitiesResponse.value.entities;
        }
        return [];
    });

    return {
        entities,
        entitiesLoading,
        entitiesError,
        refreshEntities,
    };
};

/**
 * Composable for domain campaigns data
 */
export const useDomainCampaigns = (domain: string) => {
    const { getCacheBustedKey } = useDomainCacheInvalidation();

    const {
        data: campaignsResponse,
        pending: campaignsLoading,
        error: campaignsError,
        refresh: refreshCampaigns,
    } = useLazyFetch(
        () => (domain ? `/api/domain/${domain}/campaigns` : undefined),
        {
            key: getCacheBustedKey(`domain-campaigns-${domain}`),
            query: { limit: 10 },
            server: true,
            default: () => ({ campaigns: [] }),
        }
    );

    const campaigns = computed(() => {
        if (campaignsResponse.value?.campaigns) {
            return campaignsResponse.value.campaigns;
        }
        return [];
    });

    return {
        campaigns,
        campaignsLoading,
        campaignsError,
        refreshCampaigns,
    };
};
