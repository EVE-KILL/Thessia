/**
 * Composable for generating structured data (JSON-LD) for SEO
 * Following Schema.org specifications
 */

import type { IBattles } from '~/server/interfaces/IBattles';

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
        const finalBlowAttacker = killmail.attackers.find((a) => a.final_blow);
        const attackerCount = killmail.attackers.length;
        const killTime =
            typeof killmail.kill_time === "string"
                ? killmail.kill_time
                : killmail.kill_time.toISOString();

        // Helper function to get English text from translation objects
        const getEnglishText = (
            text: { en: string } | string | undefined
        ): string => {
            if (!text) return "Unknown";
            return typeof text === "string" ? text : text.en;
        };

        const victimShipName = getEnglishText(killmail.victim.ship_name);
        const regionName = getEnglishText(killmail.region_name);

        return {
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: `EVE Online Killmail ${killmail.killmail_id} - ${victimShipName} destroyed in ${killmail.system_name}`,
            description: `Combat data from EVE Online showing the destruction of ${
                killmail.victim.character_name
                    ? `${killmail.victim.character_name}'s`
                    : "a"
            } ${victimShipName} in ${
                killmail.system_name
            }, ${regionName}. ${attackerCount} attacker${
                attackerCount > 1 ? "s" : ""
            } involved${
                finalBlowAttacker?.character_name
                    ? `, final blow by ${finalBlowAttacker.character_name}`
                    : ""
            }.`,
            url: killmail.url,
            identifier: killmail.killmail_id.toString(),
            creator: {
                "@type": "Organization",
                name: "EVE-KILL",
                url: "https://eve-kill.com",
            },
            publisher: {
                "@type": "Organization",
                name: "EVE-KILL",
                url: "https://eve-kill.com",
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
                ...(killmail.victim.corporation_name
                    ? [killmail.victim.corporation_name]
                    : []),
                ...(killmail.victim.alliance_name
                    ? [killmail.victim.alliance_name]
                    : []),
                ...(finalBlowAttacker?.corporation_name
                    ? [finalBlowAttacker.corporation_name]
                    : []),
                ...(finalBlowAttacker?.alliance_name
                    ? [finalBlowAttacker.alliance_name]
                    : []),
            ].filter(Boolean),
            spatialCoverage: {
                "@type": "Place",
                name: `${killmail.system_name}, ${regionName}`,
                additionalProperty: [
                    {
                        "@type": "PropertyValue",
                        name: "Solar System",
                        value: killmail.system_name,
                    },
                    {
                        "@type": "PropertyValue",
                        name: "Region",
                        value: regionName,
                    },
                ],
            },
            temporalCoverage: killTime,
            variableMeasured: [
                {
                    "@type": "PropertyValue",
                    name: "Victim Ship Type",
                    value: victimShipName,
                },
                {
                    "@type": "PropertyValue",
                    name: "Attacker Count",
                    value: attackerCount.toString(),
                },
                ...(killmail.total_value
                    ? [
                          {
                              "@type": "PropertyValue",
                              name: "Total Value (ISK)",
                              value: killmail.total_value.toString(),
                              unitText: "ISK",
                          },
                      ]
                    : []),
                ...(killmail.victim.character_name
                    ? [
                          {
                              "@type": "PropertyValue",
                              name: "Victim Character",
                              value: killmail.victim.character_name,
                          },
                      ]
                    : []),
                ...(killmail.victim.corporation_name
                    ? [
                          {
                              "@type": "PropertyValue",
                              name: "Victim Corporation",
                              value: killmail.victim.corporation_name,
                          },
                      ]
                    : []),
                ...(finalBlowAttacker?.character_name
                    ? [
                          {
                              "@type": "PropertyValue",
                              name: "Final Blow Character",
                              value: finalBlowAttacker.character_name,
                          },
                      ]
                    : []),
                ...(finalBlowAttacker?.ship_name
                    ? [
                          {
                              "@type": "PropertyValue",
                              name: "Final Blow Ship",
                              value: getEnglishText(
                                  finalBlowAttacker.ship_name
                              ),
                          },
                      ]
                    : []),
            ],
            distribution: {
                "@type": "DataDownload",
                contentUrl: killmail.url,
                encodingFormat: "text/html",
            },
            isBasedOn: {
                "@type": "SoftwareApplication",
                name: "EVE Online",
                publisher: {
                    "@type": "Organization",
                    name: "CCP Games",
                },
            },
        };
    };

    /**
     * Generate Dataset structured data for a battle page
     * @param battle - The battle data
     * @param battleUrl - URL of the battle page
     */
    function generateBattleDatasetStructuredData(
        battle: IBattles,
        battleUrl: string
    ) {
        const { t } = useI18n();

        // Calculate battle duration
        const startTime = new Date(battle.start_time);
        const endTime = new Date(battle.end_time);
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationHours =
            Math.round((durationMs / (1000 * 60 * 60)) * 10) / 10;

        // Get primary system info
        const primarySystem = battle.systems?.[0];
        const systemCount = battle.systems?.length || 0;

        // Calculate total participants and ISK destroyed
        const totalParticipants = battle.involved_characters_count || 0;
        const totalIskDestroyed = (
            (battle.iskDestroyed || 0) / 1000000
        ).toFixed(0); // Convert to millions

        const structuredData = {
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: `EVE Online Battle in ${
                primarySystem?.system_name || "Unknown System"
            }${systemCount > 1 ? ` +${systemCount - 1} more` : ""}`,
            description: `Battle data from ${startTime.toLocaleDateString()} lasting ${durationHours} hours with ${totalParticipants} participants and ${totalIskDestroyed}M ISK destroyed`,
            url: battleUrl,
            keywords: [
                "EVE Online",
                "Battle",
                "Combat Data",
                "Space Battle",
                primarySystem?.system_name,
                primarySystem?.region_name,
            ].filter(Boolean),
            creator: {
                "@type": "Organization",
                name: "EVE-KILL",
                url: "https://eve-kill.com",
            },
            publisher: {
                "@type": "Organization",
                name: "EVE-KILL",
                url: "https://eve-kill.com",
            },
            dateCreated: battle.start_time,
            dateModified: battle.end_time,
            temporalCoverage: `${battle.start_time}/${battle.end_time}`,
            spatialCoverage:
                battle.systems?.map((system) => ({
                    "@type": "Place",
                    name: `${system.system_name}, ${system.region_name}`,
                    additionalProperty: [
                        {
                            "@type": "PropertyValue",
                            name: "Security Status",
                            value:
                                system.system_security?.toFixed(1) || "Unknown",
                        },
                        {
                            "@type": "PropertyValue",
                            name: "System ID",
                            value: system.system_id?.toString() || "Unknown",
                        },
                    ],
                })) || [],
            variableMeasured: [
                {
                    "@type": "PropertyValue",
                    name: "Total Participants",
                    value: totalParticipants,
                    description: "Number of characters involved in the battle",
                },
                {
                    "@type": "PropertyValue",
                    name: "ISK Destroyed",
                    value: battle.iskDestroyed || 0,
                    unitText: "ISK",
                    description:
                        "Total ISK value of ships and modules destroyed",
                },
                {
                    "@type": "PropertyValue",
                    name: "Ships Destroyed",
                    value: battle.killmailsCount || 0,
                    description:
                        "Total number of ships destroyed in the battle",
                },
                {
                    "@type": "PropertyValue",
                    name: "Battle Duration",
                    value: durationMs,
                    unitText: "milliseconds",
                    description:
                        "Duration of the battle from first to last kill",
                },
            ],
            distribution: [
                {
                    "@type": "DataDownload",
                    encodingFormat: "application/json",
                    contentUrl: `${battleUrl}?format=json`,
                    description: "Battle data in JSON format",
                },
            ],
        };

    addStructuredDataToHead(structuredData);
  }

  /**
   * Generate Person structured data for a character page
   * @param character - The character data
   * @param characterUrl - URL of the character page
   * @param stats - Optional character statistics
   */
  function generateCharacterStructuredData(character: any, characterUrl: string, stats?: any) {
    const { t } = useI18n();

    // Calculate character age if birthday is available
    const characterAge = character.birthday ?
      Math.floor((new Date().getTime() - new Date(character.birthday).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) :
      null;

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Person",
      name: character.name,
      description: character.description || `EVE Online character ${character.name}`,
      url: characterUrl,
      identifier: {
        "@type": "PropertyValue",
        name: "Character ID",
        value: character.character_id?.toString()
      },
      birthDate: character.birthday,
      gender: character.gender,
      image: `https://images.evetech.net/characters/${character.character_id}/portrait?size=512`,
      memberOf: character.corporation_id ? {
        "@type": "Organization",
        name: character.corporation_name || "Unknown Corporation",
        identifier: character.corporation_id.toString(),
        url: `https://eve-kill.com/corporation/${character.corporation_id}`
      } : undefined,
      affiliation: character.alliance_id ? {
        "@type": "Organization",
        name: character.alliance_name || "Unknown Alliance",
        identifier: character.alliance_id.toString(),
        url: `https://eve-kill.com/alliance/${character.alliance_id}`
      } : undefined,
      additionalProperty: [
        {
          "@type": "PropertyValue",
          name: "Security Status",
          value: character.security_status?.toFixed(2) || "Unknown"
        },
        {
          "@type": "PropertyValue",
          name: "Race",
          value: character.race_name || "Unknown"
        },
        {
          "@type": "PropertyValue",
          name: "Bloodline",
          value: character.bloodline_name || "Unknown"
        },
        characterAge ? {
          "@type": "PropertyValue",
          name: "Character Age",
          value: `${characterAge} years`,
          unitText: "years"
        } : null,
        stats ? {
          "@type": "PropertyValue",
          name: "Total Kills",
          value: stats.kills || 0
        } : null,
        stats ? {
          "@type": "PropertyValue",
          name: "Total Losses",
          value: stats.losses || 0
        } : null,
        stats ? {
          "@type": "PropertyValue",
          name: "ISK Destroyed",
          value: stats.iskKilled || 0,
          unitText: "ISK"
        } : null
      ].filter(Boolean),
      knowsAbout: "EVE Online, Space Combat, Starship Piloting",
      worksFor: character.corporation_id ? {
        "@type": "Organization",
        name: character.corporation_name || "Unknown Corporation"
      } : undefined,
      homeLocation: {
        "@type": "Place",
        name: "New Eden",
        description: "The EVE Online universe"
      },
      hasCredential: character.security_status >= 0 ? {
        "@type": "EducationalOccupationalCredential",
        name: "CONCORD Security Status",
        description: "Positive security status indicating law-abiding behavior"
      } : undefined
    };

    addStructuredDataToHead(structuredData);
  }

  /**
   * Generate Organization structured data for a corporation page
   * @param corporation - The corporation data
   * @param corporationUrl - URL of the corporation page
   * @param stats - Optional corporation statistics
   */
  function generateCorporationStructuredData(corporation: any, corporationUrl: string, stats?: any) {
    const { t } = useI18n();

    const foundingDate = corporation.date_founded ? new Date(corporation.date_founded) : null;
    const corporationAge = foundingDate ?
      Math.floor((new Date().getTime() - foundingDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) :
      null;

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": corporationUrl,
      name: corporation.name,
      alternateName: corporation.ticker,
      description: corporation.description || `EVE Online corporation ${corporation.name} [${corporation.ticker}]`,
      url: corporationUrl,
      logo: `https://images.evetech.net/corporations/${corporation.corporation_id}/logo?size=512`,
      image: `https://images.evetech.net/corporations/${corporation.corporation_id}/logo?size=512`,
      identifier: {
        "@type": "PropertyValue",
        name: "Corporation ID",
        value: corporation.corporation_id?.toString()
      },
      foundingDate: corporation.date_founded,
      numberOfEmployees: corporation.member_count,
      taxID: corporation.tax_rate ? `${(corporation.tax_rate * 100).toFixed(1)}%` : undefined,
      parentOrganization: corporation.alliance_id ? {
        "@type": "Organization",
        name: corporation.alliance_name || "Unknown Alliance",
        identifier: corporation.alliance_id.toString(),
        url: `https://eve-kill.com/alliance/${corporation.alliance_id}`
      } : undefined,
      leader: corporation.ceo_id ? {
        "@type": "Person",
        name: corporation.ceo_name || "Unknown CEO",
        identifier: corporation.ceo_id.toString(),
        url: `https://eve-kill.com/character/${corporation.ceo_id}`,
        jobTitle: "Chief Executive Officer"
      } : undefined,
      location: corporation.home_station_id ? {
        "@type": "Place",
        name: corporation.home_station_name || "Unknown Station",
        identifier: corporation.home_station_id.toString()
      } : undefined,
      additionalProperty: [
        {
          "@type": "PropertyValue",
          name: "Tax Rate",
          value: corporation.tax_rate ? `${(corporation.tax_rate * 100).toFixed(1)}%` : "Unknown"
        },
        {
          "@type": "PropertyValue",
          name: "Member Count",
          value: corporation.member_count || 0
        },
        corporationAge ? {
          "@type": "PropertyValue",
          name: "Corporation Age",
          value: `${corporationAge} years`,
          unitText: "years"
        } : null,
        stats ? {
          "@type": "PropertyValue",
          name: "Total Kills",
          value: stats.kills || 0
        } : null,
        stats ? {
          "@type": "PropertyValue",
          name: "Total Losses",
          value: stats.losses || 0
        } : null,
        stats ? {
          "@type": "PropertyValue",
          name: "ISK Destroyed",
          value: stats.iskKilled || 0,
          unitText: "ISK"
        } : null,
        corporation.shares ? {
          "@type": "PropertyValue",
          name: "Shares",
          value: corporation.shares
        } : null
      ].filter(Boolean),
      knowsAbout: "EVE Online, Space Commerce, Corporate Management",
      industry: "Space Transportation and Combat",
      organizationType: "Corporation"
    };

    addStructuredDataToHead(structuredData);
  }

  /**
   * Generate Organization structured data for an alliance page
   * @param alliance - The alliance data
   * @param allianceUrl - URL of the alliance page
   * @param stats - Optional alliance statistics
   */
  function generateAllianceStructuredData(alliance: any, allianceUrl: string, stats?: any) {
    const { t } = useI18n();

    const foundingDate = alliance.date_founded ? new Date(alliance.date_founded) : null;
    const allianceAge = foundingDate ?
      Math.floor((new Date().getTime() - foundingDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) :
      null;

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": allianceUrl,
      name: alliance.name,
      alternateName: alliance.ticker,
      description: `EVE Online alliance ${alliance.name} [${alliance.ticker}] - A coalition of corporations in New Eden`,
      url: allianceUrl,
      logo: `https://images.evetech.net/alliances/${alliance.alliance_id}/logo?size=512`,
      image: `https://images.evetech.net/alliances/${alliance.alliance_id}/logo?size=512`,
      identifier: {
        "@type": "PropertyValue",
        name: "Alliance ID",
        value: alliance.alliance_id?.toString()
      },
      foundingDate: alliance.date_founded,
      founder: alliance.creator_id ? {
        "@type": "Person",
        name: alliance.creator_name || "Unknown Founder",
        identifier: alliance.creator_id.toString(),
        url: `https://eve-kill.com/character/${alliance.creator_id}`
      } : undefined,
      member: alliance.executor_corporation_id ? [{
        "@type": "Organization",
        name: alliance.executor_corporation_name || "Executor Corporation",
        identifier: alliance.executor_corporation_id.toString(),
        url: `https://eve-kill.com/corporation/${alliance.executor_corporation_id}`,
        roleName: "Executor Corporation"
      }] : undefined,
      additionalProperty: [
        allianceAge ? {
          "@type": "PropertyValue",
          name: "Alliance Age",
          value: `${allianceAge} years`,
          unitText: "years"
        } : null,
        stats ? {
          "@type": "PropertyValue",
          name: "Total Kills",
          value: stats.kills || 0
        } : null,
        stats ? {
          "@type": "PropertyValue",
          name: "Total Losses",
          value: stats.losses || 0
        } : null,
        stats ? {
          "@type": "PropertyValue",
          name: "ISK Destroyed",
          value: stats.iskKilled || 0,
          unitText: "ISK"
        } : null,
        {
          "@type": "PropertyValue",
          name: "Creator Corporation",
          value: alliance.creator_corporation_name || "Unknown"
        }
      ].filter(Boolean),
      knowsAbout: "EVE Online, Space Warfare, Alliance Diplomacy",
      industry: "Space Warfare and Territorial Control",
      organizationType: "Alliance",
      subOrganization: "Multiple member corporations"
    };

    addStructuredDataToHead(structuredData);
  }

  /**
   * Generate Dataset structured data for a campaign page
   * @param campaign - The campaign data
   * @param campaignUrl - URL of the campaign page
   */
  function generateCampaignDatasetStructuredData(campaign: any, campaignUrl: string) {
        const { t } = useI18n();

        // Calculate campaign duration
        const startTime = new Date(campaign.startTime);
        const endTime = campaign.endTime
            ? new Date(campaign.endTime)
            : new Date();
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24));

        // Calculate total ISK destroyed in billions for readability
        const totalIskDestroyed = (
            (campaign.totalISKDestroyed || 0) / 1000000000
        ).toFixed(1); // Convert to billions

        // Determine campaign type and scope
        const hasAttackers = Object.keys(campaign.campaignQuery || {}).some(
            (key) => key.startsWith("attackers.")
        );
        const hasVictims = Object.keys(campaign.campaignQuery || {}).some(
            (key) => key.startsWith("victim.")
        );
        const campaignType =
            hasAttackers && hasVictims
                ? "Conflict Analysis"
                : hasAttackers
                ? "Attacker Analysis"
                : hasVictims
                ? "Victim Analysis"
                : "General Combat Analysis";

        const structuredData = {
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: `${campaign.name} - EVE Online Campaign`,
            description:
                campaign.description ||
                `${campaignType} campaign spanning ${durationDays} days with ${
                    campaign.totalKills || 0
                } kills and ${totalIskDestroyed}B ISK destroyed`,
            url: campaignUrl,
            keywords: [
                "EVE Online",
                "Campaign",
                "Combat Analytics",
                "Military Campaign",
                "PvP Data",
                campaignType,
            ].filter(Boolean),
            creator: {
                "@type": "Organization",
                name: "EVE-KILL",
                url: "https://eve-kill.com",
            },
            publisher: {
                "@type": "Organization",
                name: "EVE-KILL",
                url: "https://eve-kill.com",
            },
            dateCreated: campaign.startTime,
            dateModified: campaign.endTime || new Date().toISOString(),
            temporalCoverage: campaign.endTime
                ? `${campaign.startTime}/${campaign.endTime}`
                : `${campaign.startTime}/..`,
            spatialCoverage:
                campaign.filterEntities?.regions?.map((region: any) => ({
                    "@type": "Place",
                    name: region.name,
                    additionalProperty: {
                        "@type": "PropertyValue",
                        name: "Region ID",
                        value: region.region_id?.toString(),
                    },
                })) || [],
            variableMeasured: [
                {
                    "@type": "PropertyValue",
                    name: "Total Kills",
                    value: campaign.totalKills || 0,
                    description: "Number of killmails in this campaign",
                },
                {
                    "@type": "PropertyValue",
                    name: "ISK Destroyed",
                    value: campaign.totalISKDestroyed || 0,
                    unitText: "ISK",
                    description:
                        "Total ISK value of ships and modules destroyed",
                },
                {
                    "@type": "PropertyValue",
                    name: "Ships Destroyed",
                    value: campaign.shipsDestroyed || 0,
                    description:
                        "Total number of ships destroyed in the campaign",
                },
                {
                    "@type": "PropertyValue",
                    name: "Campaign Duration",
                    value: durationMs,
                    unitText: "milliseconds",
                    description: "Duration of the campaign period",
                },
                {
                    "@type": "PropertyValue",
                    name: "Average ISK per Kill",
                    value: campaign.totalKills
                        ? Math.round(
                              (campaign.totalISKDestroyed || 0) /
                                  campaign.totalKills
                          )
                        : 0,
                    unitText: "ISK",
                    description: "Average ISK value per killmail",
                },
            ],
            distribution: [
                {
                    "@type": "DataDownload",
                    encodingFormat: "application/json",
                    contentUrl: `${campaignUrl}?format=json`,
                    description: "Campaign data in JSON format",
                },
            ],
            additionalProperty: [
                {
                    "@type": "PropertyValue",
                    name: "Campaign Type",
                    value: campaignType,
                },
                {
                    "@type": "PropertyValue",
                    name: "Privacy Status",
                    value: campaign.public ? "Public" : "Private",
                },
                {
                    "@type": "PropertyValue",
                    name: "Processing Status",
                    value: campaign.processing ? "Processing" : "Completed",
                },
            ],
        };

        addStructuredDataToHead(structuredData);
    }

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
        generateBattleDatasetStructuredData,
        generateCampaignDatasetStructuredData,
        generateCharacterStructuredData,
        generateCorporationStructuredData,
        generateAllianceStructuredData,
        addStructuredDataToHead,
    };
};
