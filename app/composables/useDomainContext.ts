// Define interfaces locally since server types aren't directly accessible in client
interface IDomainContext {
    isCustomDomain: boolean;
    domain?: string;
    config?: any;
    entity?: any;
    entityType?: "character" | "corporation" | "alliance";
}

/**
 * Composable for accessing domain context throughout the application
 */
export const useDomainContext = () => {
    // Get domain context from Nuxt context
    const nuxtApp = useNuxtApp();

    // Create a reactive state that persists across client navigation
    const domainContextState = useState<IDomainContext>("domainContext", () => {
        // Initialize from SSR context if available
        if (
            process.server &&
            nuxtApp.ssrContext?.event?.context?.domainContext
        ) {
            const context = nuxtApp.ssrContext.event.context.domainContext;
            // Serialize the context to avoid Mongoose object serialization issues
            return {
                isCustomDomain: context.isCustomDomain,
                domain: context.domain,
                entityType: context.entityType,
                entity: context.entity
                    ? JSON.parse(JSON.stringify(context.entity))
                    : null,
                config: context.config
                    ? {
                          entity_type: context.config.entity_type,
                          entity_id: context.config.entity_id,
                          domain: context.config.domain,
                          active: context.config.active,
                          verified: context.config.verified,
                          default_page: context.config.default_page,
                          public_campaigns: context.config.public_campaigns,
                          branding: context.config.branding
                              ? JSON.parse(
                                    JSON.stringify(context.config.branding)
                                )
                              : null,
                      }
                    : null,
            };
        }

        // Fallback for client-side or when no custom domain
        return {
            isCustomDomain: false,
        };
    });

    const domainContext = computed<IDomainContext>(() => {
        return domainContextState.value;
    });

    // Reactive helpers
    const isCustomDomain = computed(() => domainContext.value.isCustomDomain);
    const customDomain = computed(() => domainContext.value.domain);
    const entityType = computed(() => domainContext.value.entityType);
    const entity = computed(() => domainContext.value.entity);
    const branding = computed(() => domainContext.value.config?.branding);

    /**
     * Generate entity-specific URL for custom domains
     */
    const entityUrl = (path: string = "") => {
        if (!isCustomDomain.value || !entity.value) {
            return path;
        }

        const { entityType: type, entity: ent } = domainContext.value;
        if (!type || !ent) return path;

        const entityId = ent[`${type}_id`];
        const entityPath = `/${type}/${entityId}${path}`;
        return entityPath;
    };

    /**
     * Get default page for entity based on domain config
     */
    const getDefaultPage = () => {
        if (!isCustomDomain.value || !domainContext.value.config) {
            return "dashboard";
        }
        return domainContext.value.config.default_page || "dashboard";
    };

    /**
     * Check if campaigns should be shown on this domain
     */
    const showCampaigns = computed(() => {
        if (!isCustomDomain.value || !domainContext.value.config) {
            return false;
        }
        return domainContext.value.config.public_campaigns;
    });

    /**
     * Get page title for custom domain
     */
    const getPageTitle = (defaultTitle: string) => {
        if (!isCustomDomain.value || !branding.value?.header_title) {
            return defaultTitle;
        }
        return branding.value.header_title;
    };

    /**
     * Check if EVE-KILL branding should be shown
     */
    const showEveKillBranding = computed(() => {
        if (!isCustomDomain.value || !branding.value) {
            return true;
        }
        return branding.value.show_eve_kill_branding;
    });

    return {
        // Core domain context
        domainContext: readonly(domainContext),
        isCustomDomain,
        customDomain,
        entityType,
        entity,
        branding,

        // Helper functions
        entityUrl,
        getDefaultPage,
        getPageTitle,

        // Feature flags
        showCampaigns,
        showEveKillBranding,
    };
};

/**
 * Composable for generating custom CSS variables from branding
 */
export const useCustomBranding = () => {
    const { branding, isCustomDomain } = useDomainContext();

    const customCssVariables = computed(() => {
        if (!isCustomDomain.value || !branding.value) {
            return {};
        }

        const vars: Record<string, string> = {};

        if (branding.value.primary_color) {
            vars["--color-primary"] = branding.value.primary_color;
        }

        if (branding.value.secondary_color) {
            vars["--color-secondary"] = branding.value.secondary_color;
        }

        return vars;
    });

    const customCssClasses = computed(() => {
        if (!isCustomDomain.value) {
            return "";
        }

        const classes = ["custom-domain"];

        if (branding.value?.primary_color) {
            classes.push("has-custom-primary");
        }

        if (branding.value?.secondary_color) {
            classes.push("has-custom-secondary");
        }

        return classes.join(" ");
    });

    const customCss = computed(() => {
        if (!isCustomDomain.value || !branding.value?.custom_css) {
            return "";
        }
        return branding.value.custom_css;
    });

    return {
        customCssVariables,
        customCssClasses,
        customCss,
        branding,
    };
};

/**
 * Composable for domain-aware navigation
 */
export const useDomainNavigation = () => {
    const { isCustomDomain, entityType, entity } = useDomainContext();
    const router = useRouter();

    /**
     * Navigate to a page within the current domain context
     */
    const navigateWithinDomain = (path: string) => {
        if (!isCustomDomain.value) {
            return navigateTo(path);
        }

        // For custom domains, ensure we stay within the entity context
        if (path.startsWith("/")) {
            return navigateTo(path);
        }

        // Relative navigation within entity
        const entityPath = entityUrl(path);
        return navigateTo(entityPath);
    };

    /**
     * Generate entity-specific URL
     */
    const entityUrl = (path: string = "") => {
        if (!isCustomDomain.value || !entity.value) {
            return path;
        }

        const entityId = entity.value[`${entityType.value}_id`];
        return `/${entityType.value}/${entityId}${path}`;
    };

    return {
        navigateWithinDomain,
        entityUrl,
    };
};
