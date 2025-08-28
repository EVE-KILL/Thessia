/**
 * SEO composable for custom domains
 * Handles domain-specific SEO optimization including meta tags, canonical URLs, and structured data
 */
export const useDomainSeo = () => {
    const {
        domainContext,
        isCustomDomain,
        customDomain,
        entityType,
        entity,
        branding,
    } = useDomainContext();
    const { $i18n } = useNuxtApp();
    const route = useRoute();

    /**
     * Set domain-specific page SEO metadata
     */
    const setDomainPageSeo = (
        options: {
            title?: string;
            description?: string;
            keywords?: string[];
            entityInfo?: any;
            image?: string;
            noIndex?: boolean;
            customCanonical?: string;
        } = {}
    ) => {
        const config = domainContext.value.config;

        // Build the canonical URL
        const canonicalBase = isCustomDomain.value
            ? `https://${customDomain.value || "eve-kill.com"}`
            : "https://eve-kill.com";

        const canonicalUrl =
            options.customCanonical || `${canonicalBase}${route.path}`;

        // Build the title
        let pageTitle = options.title;
        if (branding.value?.header_title && isCustomDomain.value) {
            pageTitle = pageTitle
                ? `${options.title} - ${branding.value.header_title}`
                : branding.value.header_title;
        } else {
            pageTitle = pageTitle ? `${options.title} - EVE-KILL` : "EVE-KILL";
        }

        // Build description with domain context
        let description = options.description;
        if (isCustomDomain.value && options.entityInfo) {
            const entityName = options.entityInfo.name;
            const entityTypeValue = entityType.value;
            description =
                description ||
                `${entityName} ${entityTypeValue} killboard - EVE Online PVP statistics and ship loss data`;
        }

        // Set up meta tags
        useSeoMeta({
            title: pageTitle,
            description:
                description ||
                "EVE Online killboard providing detailed PVP statistics, ship loss reports, and player achievements.",
            keywords:
                options.keywords?.join(", ") ||
                "EVE Online, killboard, PVP statistics, ship loss reports, player achievements",

            // Open Graph
            ogTitle: pageTitle,
            ogDescription:
                description ||
                "EVE Online killboard providing detailed PVP statistics, ship loss reports, and player achievements.",
            ogUrl: canonicalUrl,
            ogSiteName: isCustomDomain.value
                ? branding.value?.header_title || "EVE-KILL"
                : "EVE-KILL",
            ogType: "website",
            ogImage: options.image || "/images/og-default.png",

            // Twitter Card
            twitterCard: "summary_large_image",
            twitterSite: "@evekill",
            twitterTitle: pageTitle,
            twitterDescription:
                description ||
                "EVE Online killboard providing detailed PVP statistics, ship loss reports, and player achievements.",
            twitterImage: options.image || "/images/og-default.png",

            // Additional meta
            robots: options.noIndex ? "noindex,nofollow" : "index,follow",
            author: "EVE-KILL",
            generator: "EVE-KILL",
        });

        // Set canonical URL separately
        useHead({
            link: [{ rel: "canonical", href: canonicalUrl }],
        });

        // Add structured data
        if (options.entityInfo && isCustomDomain.value) {
            addDomainStructuredData(options.entityInfo, config);
        }
    };

    /**
     * Add structured data for custom domain entities
     */
    const addDomainStructuredData = (entityInfo: any, config: any) => {
        const structuredData = {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: entityInfo.name,
            url: `https://${customDomain.value}`,
            description: `${entityInfo.name} ${config?.entity_type} killboard - EVE Online PVP statistics and ship loss data`,
            sameAs: [
                `https://eve-kill.com/${config?.entity_type}/${config?.entity_id}`,
            ],
            additionalType: "https://schema.org/SportsOrganization",
            sport: "EVE Online",
            memberOf: {
                "@type": "Organization",
                name: "EVE Online",
                url: "https://www.eveonline.com",
            },
        };

        // Add corporation/alliance specific data
        if (config?.entity_type === "corporation" && entityInfo.alliance_id) {
            structuredData.memberOf = {
                "@type": "Organization",
                name: "Alliance",
                url: `https://eve-kill.com/alliance/${entityInfo.alliance_id}`,
            };
        }

        useHead({
            script: [
                {
                    type: "application/ld+json",
                    innerHTML: JSON.stringify(structuredData),
                },
            ],
        });
    };

    /**
     * Generate domain-specific breadcrumb data
     */
    const generateDomainBreadcrumbs = (
        breadcrumbs: Array<{ name: string; path?: string }>
    ) => {
        const baseUrl = isCustomDomain.value
            ? `https://${customDomain.value || "eve-kill.com"}`
            : "https://eve-kill.com";

        const breadcrumbList = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: breadcrumbs.map((crumb, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: crumb.name,
                ...(crumb.path && { item: `${baseUrl}${crumb.path}` }),
            })),
        };

        useHead({
            script: [
                {
                    type: "application/ld+json",
                    innerHTML: JSON.stringify(breadcrumbList),
                },
            ],
        });
    };

    /**
     * Set domain-specific hreflang tags for internationalization
     */
    const setDomainHreflang = (availableLocales?: string[]) => {
        if (!isCustomDomain.value) return;

        const baseUrl = `https://${customDomain.value}`;
        const locales = availableLocales || [
            "en",
            "de",
            "es",
            "fr",
            "ja",
            "ko",
            "ru",
            "zh",
        ];

        const hreflangLinks = locales.map((locale) => ({
            rel: "alternate",
            hreflang: locale,
            href: `${baseUrl}${route.path}?lang=${locale}`,
        }));

        // Add x-default
        hreflangLinks.push({
            rel: "alternate",
            hreflang: "x-default",
            href: `${baseUrl}${route.path}`,
        });

        useHead({
            link: hreflangLinks,
        });
    };

    /**
     * Generate Open Graph image for killmails/entities on custom domains
     */
    const generateCustomDomainOgImage = (
        type: "killmail" | "entity",
        id: string | number
    ) => {
        if (!isCustomDomain.value) return "/images/og-default.png";

        // Generate custom OG image URL with domain branding
        const baseUrl = `https://eve-kill.com/api/og`;
        const params = new URLSearchParams({
            type,
            id: id.toString(),
            domain: customDomain.value || "",
            ...(branding.value?.primary_color && {
                color: branding.value.primary_color,
            }),
            ...(branding.value?.logo_url && { logo: branding.value.logo_url }),
        });

        return `${baseUrl}?${params.toString()}`;
    };

    /**
     * Optimize custom domain for search engines
     */
    const optimizeCustomDomainSeo = async (entityInfo: any) => {
        const config = domainContext.value.config;

        if (!isCustomDomain.value || !config || !entityInfo) return;

        // Set domain-specific meta tags
        setDomainPageSeo({
            title: entityInfo.name,
            description: `${entityInfo.name} ${config.entity_type} killboard - Track PVP statistics, ship losses, and combat achievements in EVE Online`,
            keywords: [
                "EVE Online",
                "killboard",
                entityInfo.name,
                config.entity_type,
                "PVP statistics",
                "ship losses",
                "combat data",
            ],
            entityInfo,
            image: generateCustomDomainOgImage("entity", config.entity_id),
        });

        // Generate structured data
        addDomainStructuredData(entityInfo, config);

        // Set hreflang tags
        setDomainHreflang();
    };

    return {
        setDomainPageSeo,
        addDomainStructuredData,
        generateDomainBreadcrumbs,
        setDomainHreflang,
        generateCustomDomainOgImage,
        optimizeCustomDomainSeo,
    };
};
