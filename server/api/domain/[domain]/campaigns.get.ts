import { createHash } from "crypto";

export default defineCachedEventHandler(
    async (event) => {
        try {
            const domain = getRouterParam(event as any, "domain");

            if (!domain) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Domain parameter is required",
                });
            }

            // Get domain configuration
            const domainConfig = await CustomDomains.findOne({ domain }).lean();

            if (!domainConfig) {
                throw createError({
                    statusCode: 404,
                    statusMessage: "Domain not found",
                });
            }

            // Parse query parameters
            const query = getQuery(event as any);
            const page = parseInt(query.page?.toString() || "1", 10);
            const limit = Math.min(
                parseInt(query.limit?.toString() || "4", 10),
                50
            ); // Default to 4 for domain pages, cap at 50
            const skip = (page - 1) * limit;

            // If no entities configured, return empty result
            if (!domainConfig.entities || domainConfig.entities.length === 0) {
                return {
                    campaigns: [],
                    pagination: {
                        currentPage: page,
                        totalPages: 0,
                        totalItems: 0,
                        itemsPerPage: limit,
                    },
                };
            }

            // Get all public campaigns first
            const allCampaigns = await Campaigns.find({ public: true })
                .sort({ createdAt: -1 })
                .select({
                    _id: 0,
                    campaign_id: 1,
                    name: 1,
                    description: 1,
                    startTime: 1,
                    endTime: 1,
                    public: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    processed_data: 1,
                    query: 1, // Include query to check relevance
                })
                .lean();

            // Filter campaigns by checking if any domain entity appears in the campaign query
            const domainEntityIds = domainConfig.entities.map(
                (e) => e.entity_id
            );
            const domainEntitiesByType = domainConfig.entities.reduce(
                (acc, entity) => {
                    if (!acc[entity.entity_type]) acc[entity.entity_type] = [];
                    acc[entity.entity_type].push(entity.entity_id);
                    return acc;
                },
                {} as Record<string, number[]>
            );

            let relevantCampaigns = allCampaigns.filter((campaign) => {
                if (!campaign.query) return false;

                // Check each entity type for matches in campaign query
                for (const [entityType, entityIds] of Object.entries(
                    domainEntitiesByType
                )) {
                    // Check attacker conditions
                    const attackerField = `attackers.${entityType}_id`;
                    if (campaign.query[attackerField]) {
                        // Check direct match
                        if (
                            typeof campaign.query[attackerField] === "number" &&
                            entityIds.includes(campaign.query[attackerField])
                        ) {
                            return true;
                        }
                        // Check $in array match
                        if (
                            campaign.query[attackerField].$in &&
                            Array.isArray(campaign.query[attackerField].$in)
                        ) {
                            const hasMatch = campaign.query[
                                attackerField
                            ].$in.some((id: number) => entityIds.includes(id));
                            if (hasMatch) return true;
                        }
                    }

                    // Check victim conditions
                    const victimField = `victim.${entityType}_id`;
                    if (campaign.query[victimField]) {
                        // Check direct match
                        if (
                            typeof campaign.query[victimField] === "number" &&
                            entityIds.includes(campaign.query[victimField])
                        ) {
                            return true;
                        }
                        // Check $in array match
                        if (
                            campaign.query[victimField].$in &&
                            Array.isArray(campaign.query[victimField].$in)
                        ) {
                            const hasMatch = campaign.query[
                                victimField
                            ].$in.some((id: number) => entityIds.includes(id));
                            if (hasMatch) return true;
                        }
                    }
                }

                return false;
            });

            // If there's a featured campaign, prioritize it to appear first
            const featuredCampaignId =
                domainConfig.features?.featured_campaign_id;
            if (featuredCampaignId) {
                // Find the featured campaign in our relevant campaigns
                const featuredCampaignIndex = relevantCampaigns.findIndex(
                    (campaign) => campaign.campaign_id === featuredCampaignId
                );

                if (featuredCampaignIndex > -1) {
                    // Move featured campaign to the front
                    const featuredCampaign = relevantCampaigns.splice(
                        featuredCampaignIndex,
                        1
                    )[0];
                    relevantCampaigns.unshift(featuredCampaign);
                }
            }

            // Apply pagination to relevant campaigns
            const totalItems = relevantCampaigns.length;
            const paginatedCampaigns = relevantCampaigns.slice(
                skip,
                skip + limit
            );

            // Process campaigns to add status and basic stats
            const campaigns = paginatedCampaigns.map((campaign) => {
                const now = new Date();
                let status = "active";

                if (campaign.startTime > now) {
                    status = "upcoming";
                } else if (campaign.endTime && campaign.endTime < now) {
                    status = "completed";
                }

                // Extract basic stats from processed_data if available
                const stats = campaign.processed_data
                    ? {
                          total_kills:
                              (campaign.processed_data as any).totalKills || 0,
                          total_value:
                              (campaign.processed_data as any).totalValue || 0,
                          participants:
                              (campaign.processed_data as any)
                                  .uniqueCharacters || 0,
                      }
                    : {
                          total_kills: 0,
                          total_value: 0,
                          participants: 0,
                      };

                return {
                    campaign_id: campaign.campaign_id,
                    name: campaign.name,
                    description: campaign.description,
                    startTime: campaign.startTime,
                    endTime: campaign.endTime,
                    status,
                    active: status === "active",
                    stats,
                    createdAt: campaign.createdAt,
                    updatedAt: campaign.updatedAt,
                };
            });

            const totalPages = Math.ceil(totalItems / limit);

            return {
                campaigns,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems,
                    itemsPerPage: limit,
                },
            };
        } catch (error: any) {
            console.error("Error fetching domain campaigns:", error);
            throw createError({
                statusCode: 500,
                statusMessage: "Error fetching domain campaigns",
            });
        }
    },
    {
        maxAge: 5,
        staleMaxAge: 0,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const domain = getRouterParam(event as any, "domain");
            const query = getQuery(event as any);
            const page = query?.page || "1";
            const limit = query?.limit || "4";

            // Create a hash of the parameters to avoid key length issues
            const keyContent = `domain:${domain}:campaigns:${page}:${limit}:v3`;
            const hash = createHash("sha256")
                .update(keyContent)
                .digest("hex")
                .substring(0, 16);

            return `domain:campaigns:${hash}`;
        },
    }
);
