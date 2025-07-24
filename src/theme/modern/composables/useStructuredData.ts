/**
 * Composable for generating structured data (JSON-LD) for SEO
 * Following Schema.org specifications
 */

export const useStructuredData = () => {
    const { t } = useI18n();

    /**
     * Generate FAQ page structured data
     * @param faqItems Array of FAQ items with label and content
     */
    const generateFAQStructuredData = (
        faqItems: Array<{ label: string; content: string }>
    ) => {
        return {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqItems.map((item) => ({
                "@type": "Question",
                name: item.label,
                acceptedAnswer: {
                    "@type": "Answer",
                    text: item.content,
                },
            })),
        };
    };

    /**
     * Generate website navigation structured data
     * @param navigationItems Array of navigation items
     */
    const generateWebsiteStructuredData = (
        navigationItems: Array<{
            name: string;
            url: string;
            children?: Array<{ name: string; url: string }>;
        }>
    ) => {
        return {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "EVE-KILL",
            alternateName: "Thessia",
            url: "https://eve-kill.com",
            description:
                "The premier EVE Online killboard tracking combat data, killmails, and battle reports across New Eden",
            potentialAction: {
                "@type": "SearchAction",
                target: {
                    "@type": "EntryPoint",
                    urlTemplate:
                        "https://eve-kill.com/search?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
            },
            mainEntity: {
                "@type": "SiteNavigationElement",
                name: "Main Navigation",
                hasPart: navigationItems.map((item) => ({
                    "@type": "SiteNavigationElement",
                    name: item.name,
                    url: item.url,
                    ...(item.children && {
                        hasPart: item.children.map((child) => ({
                            "@type": "SiteNavigationElement",
                            name: child.name,
                            url: child.url,
                        })),
                    }),
                })),
            },
        };
    };

    /**
     * Generate organization structured data
     */
    const generateOrganizationStructuredData = () => {
        return {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "EVE-KILL",
            alternateName: "Thessia",
            url: "https://eve-kill.com",
            logo: "https://eve-kill.com/logo.png",
            description:
                "The premier EVE Online killboard providing comprehensive combat data tracking, killmail analysis, and battle reports for the EVE Online community",
            applicationCategory: "Gaming/Entertainment",
            operatingSystem: "Web",
            sameAs: [
                "https://discord.gg/R9gZRc4Jtn",
                "https://github.com/eve-kill/Thessia",
            ],
            contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer support",
                url: "https://discord.gg/R9gZRc4Jtn",
            },
        };
    };

    /**
     * Generate breadcrumb structured data
     * @param breadcrumbs Array of breadcrumb items
     */
    const generateBreadcrumbStructuredData = (
        breadcrumbs: Array<{ name: string; url: string }>
    ) => {
        return {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: breadcrumbs.map((item, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: item.name,
                item: item.url,
            })),
        };
    };

    /**
     * Generate article structured data (for blog posts, guides, etc.)
     * @param article Article data
     */
    const generateArticleStructuredData = (article: {
        headline: string;
        description: string;
        author: string;
        datePublished: string;
        dateModified?: string;
        image?: string;
        url: string;
    }) => {
        return {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article.headline,
            description: article.description,
            author: {
                "@type": "Organization",
                name: article.author,
            },
            publisher: {
                "@type": "Organization",
                name: "EVE-KILL",
                logo: {
                    "@type": "ImageObject",
                    url: "https://eve-kill.com/logo.png",
                },
            },
            datePublished: article.datePublished,
            dateModified: article.dateModified || article.datePublished,
            mainEntityOfPage: {
                "@type": "WebPage",
                "@id": article.url,
            },
            ...(article.image && {
                image: {
                    "@type": "ImageObject",
                    url: article.image,
                },
            }),
        };
    };

    /**
     * Add structured data to the page head
     * @param structuredData Single structured data object or array of objects
     */
    const addStructuredDataToHead = (structuredData: object | object[]) => {
        const dataArray = Array.isArray(structuredData)
            ? structuredData
            : [structuredData];

        useHead({
            script: dataArray.map((data) => ({
                type: "application/ld+json",
                innerHTML: JSON.stringify(data),
            })),
        });
    };

    return {
        generateFAQStructuredData,
        generateWebsiteStructuredData,
        generateOrganizationStructuredData,
        generateBreadcrumbStructuredData,
        generateArticleStructuredData,
        addStructuredDataToHead,
    };
};
