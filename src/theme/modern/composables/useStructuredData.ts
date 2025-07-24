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
     * Generate dataset structured data for killmails
     * @param killmail Killmail data
     */
    const generateKillmailDatasetStructuredData = (killmail: {
        killmail_id: number;
        kill_time: Date | string;
        victim: {
            character_name?: string;
            corporation_name?: string;
            alliance_name?: string;
            ship_name: { en: string } | string;
        };
        attackers: Array<{
            character_name?: string;
            corporation_name?: string;
            alliance_name?: string;
            ship_name?: { en: string } | string;
            weapon_type_name?: { en: string } | string;
            final_blow: boolean;
        }>;
        system_name: string;
        region_name: { en: string } | string;
        total_value?: number;
        url: string;
    }) => {
        const finalBlowAttacker = killmail.attackers.find(a => a.final_blow);
        const attackerCount = killmail.attackers.length;
        const killTime = typeof killmail.kill_time === 'string' ? killmail.kill_time : killmail.kill_time.toISOString();
        
        // Helper function to get English text from translation objects
        const getEnglishText = (text: { en: string } | string | undefined): string => {
            if (!text) return 'Unknown';
            return typeof text === 'string' ? text : text.en;
        };
        
        const victimShipName = getEnglishText(killmail.victim.ship_name);
        const regionName = getEnglishText(killmail.region_name);
        
        return {
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: `EVE Online Killmail ${killmail.killmail_id} - ${victimShipName} destroyed in ${killmail.system_name}`,
            description: `Combat data from EVE Online showing the destruction of ${killmail.victim.character_name ? `${killmail.victim.character_name}'s` : 'a'} ${victimShipName} in ${killmail.system_name}, ${regionName}. ${attackerCount} attacker${attackerCount > 1 ? 's' : ''} involved${finalBlowAttacker?.character_name ? `, final blow by ${finalBlowAttacker.character_name}` : ''}.`,
            url: killmail.url,
            identifier: killmail.killmail_id.toString(),
            creator: {
                "@type": "Organization",
                name: "EVE-KILL",
                url: "https://eve-kill.com"
            },
            publisher: {
                "@type": "Organization",
                name: "EVE-KILL",
                url: "https://eve-kill.com"
            },
            dateCreated: killTime,
            datePublished: killTime,
            license: "https://developers.eveonline.com/license-agreement",
            keywords: [
                "EVE Online",
                "killmail",
                "combat data",
                "spaceship",
                victimShipName,
                killmail.system_name,
                regionName,
                ...(killmail.victim.corporation_name ? [killmail.victim.corporation_name] : []),
                ...(killmail.victim.alliance_name ? [killmail.victim.alliance_name] : []),
                ...(finalBlowAttacker?.corporation_name ? [finalBlowAttacker.corporation_name] : []),
                ...(finalBlowAttacker?.alliance_name ? [finalBlowAttacker.alliance_name] : [])
            ].filter(Boolean),
            spatialCoverage: {
                "@type": "Place",
                name: `${killmail.system_name}, ${regionName}`,
                additionalProperty: [
                    {
                        "@type": "PropertyValue",
                        name: "Solar System",
                        value: killmail.system_name
                    },
                    {
                        "@type": "PropertyValue", 
                        name: "Region",
                        value: regionName
                    }
                ]
            },
            temporalCoverage: killTime,
            variableMeasured: [
                {
                    "@type": "PropertyValue",
                    name: "Victim Ship Type",
                    value: victimShipName
                },
                {
                    "@type": "PropertyValue",
                    name: "Attacker Count",
                    value: attackerCount.toString()
                },
                ...(killmail.total_value ? [{
                    "@type": "PropertyValue",
                    name: "Total Value (ISK)",
                    value: killmail.total_value.toString(),
                    unitText: "ISK"
                }] : []),
                ...(killmail.victim.character_name ? [{
                    "@type": "PropertyValue",
                    name: "Victim Character",
                    value: killmail.victim.character_name
                }] : []),
                ...(killmail.victim.corporation_name ? [{
                    "@type": "PropertyValue",
                    name: "Victim Corporation", 
                    value: killmail.victim.corporation_name
                }] : []),
                ...(finalBlowAttacker?.character_name ? [{
                    "@type": "PropertyValue",
                    name: "Final Blow Character",
                    value: finalBlowAttacker.character_name
                }] : []),
                ...(finalBlowAttacker?.ship_name ? [{
                    "@type": "PropertyValue",
                    name: "Final Blow Ship",
                    value: getEnglishText(finalBlowAttacker.ship_name)
                }] : [])
            ],
            distribution: {
                "@type": "DataDownload",
                contentUrl: killmail.url,
                encodingFormat: "text/html"
            },
            isBasedOn: {
                "@type": "SoftwareApplication",
                name: "EVE Online",
                publisher: {
                    "@type": "Organization", 
                    name: "CCP Games"
                }
            }
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
        generateKillmailDatasetStructuredData,
        addStructuredDataToHead,
    };
};
