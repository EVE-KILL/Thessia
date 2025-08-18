export default defineCachedEventHandler(
    async (event: any) => {
        const campaignId = getRouterParam(event, "id");

        if (!campaignId) {
            throw createError({
                statusCode: 400,
                statusMessage: "Campaign ID is required",
            });
        }

        try {
            // Get pagination parameters
            const query = getQuery(event);
            const page = parseInt(query.page as string) || 1;
            const limit = Math.min(parseInt(query.limit as string) || 25, 1000); // Allow up to 1000 killmails per request
            const skip = (page - 1) * limit;

            // Find the campaign
            const campaign = await Campaigns.findOne({
                campaign_id: campaignId,
            });

            if (!campaign) {
                throw createError({
                    statusCode: 404,
                    statusMessage: "Campaign not found",
                });
            }

            // Use the expanded query function from CampaignHelper
            const killmailQuery = buildExpandedQuery(campaign.query);

            // Determine optimal index hint for the campaign query
            const sortOptions = { kill_time: -1 };
            const hint = await determineOptimalIndexHint(
                Killmails.collection,
                killmailQuery,
                sortOptions,
                "[Campaign API]"
            );

            // Start count query in parallel (no await yet)
            let countQuery = Killmails.countDocuments(killmailQuery);
            if (hint) {
                countQuery = countQuery.hint(hint);
            }
            const countPromise = countQuery;

            // Create cursor for streaming killmails
            let cursor = Killmails.find(
                killmailQuery,
                { _id: 0, items: 0 }, // Exclude _id and items for efficiency
                {
                    sort: { kill_time: -1 }, // Newest first
                    skip: skip,
                    limit: limit + 1, // Get one extra to check if there are more
                }
            );

            // Apply index hint to cursor if we have one
            if (hint) {
                cursor = cursor.hint(hint);
            }

            // Process killmails with cursor and format on-the-fly
            const formattedKillmails: IKillList[] = [];
            let killmailCount = 0;
            let hasMore = false;

            // Stream through killmails using cursor
            for await (const killmail of cursor) {
                // If we've reached our limit + 1, we know there are more results
                if (killmailCount >= limit) {
                    hasMore = true;
                    break;
                }

                // Find final blow attacker
                const finalBlowAttacker: any =
                    killmail.attackers.find((a: any) => a.final_blow) ||
                    killmail.attackers[0] ||
                    {};

                // Format killmail immediately without storing in memory
                formattedKillmails.push({
                    killmail_id: killmail.killmail_id,
                    total_value: killmail.total_value,
                    system_id: killmail.system_id,
                    system_name: killmail.system_name,
                    system_security: killmail.system_security,
                    region_id: killmail.region_id,
                    region_name: killmail.region_name || {},
                    kill_time: killmail.kill_time.toISOString(),
                    attackerCount: killmail.attackers.length,
                    commentCount: 0, // Default to 0 for now
                    is_npc: killmail.is_npc,
                    is_solo: killmail.is_solo,
                    victim: {
                        ship_id: killmail.victim.ship_id,
                        ship_name: killmail.victim.ship_name || {},
                        character_id: killmail.victim.character_id,
                        character_name: killmail.victim.character_name,
                        corporation_id: killmail.victim.corporation_id,
                        corporation_name: killmail.victim.corporation_name,
                        alliance_id: killmail.victim.alliance_id || 0,
                        alliance_name: killmail.victim.alliance_name || "",
                        faction_id: killmail.victim.faction_id || 0,
                        faction_name: killmail.victim.faction_name || "",
                    },
                    finalblow: {
                        character_id: finalBlowAttacker?.character_id || 0,
                        character_name: finalBlowAttacker?.character_name || "",
                        corporation_id: finalBlowAttacker?.corporation_id || 0,
                        corporation_name:
                            finalBlowAttacker?.corporation_name || "",
                        alliance_id: finalBlowAttacker?.alliance_id || 0,
                        alliance_name: finalBlowAttacker?.alliance_name || "",
                        faction_id: finalBlowAttacker?.faction_id || 0,
                        faction_name: finalBlowAttacker?.faction_name || "",
                        ship_group_name:
                            finalBlowAttacker?.ship_group_name || "",
                        is_npc: finalBlowAttacker?.is_npc || false,
                    },
                });

                killmailCount++;
            }

            // Now await the count while we've been processing killmails
            const totalCount = await countPromise;

            // Return formatted killmails with pagination info including accurate total
            return {
                killmails: formattedKillmails,
                pagination: {
                    page,
                    limit,
                    hasMore,
                    total: totalCount, // Return accurate total count, no artificial capping
                },
            };
        } catch (error: any) {
            console.error(
                `Error fetching killmails for campaign ${campaignId}:`,
                error
            );

            // Forward HTTP errors
            if (error.statusCode) {
                throw error;
            }

            // Otherwise, create a generic error
            throw createError({
                statusCode: 500,
                statusMessage: "Error fetching campaign killmails",
                message: error.message || "Error fetching campaign killmails",
            });
        }
    },
    {
        maxAge: 3600,
        staleMaxAge: -1,
        swr: true,
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
        getKey: (event: any) => {
            const campaignId = getRouterParam(event, "id");
            const query = getQuery(event);
            const page = query?.page ? query.page.toString() : "1";
            const limit = query?.limit ? query.limit.toString() : "25"; // Include limit in key as it affects the result set
            // Add other relevant query parameters if they are used for filtering/sorting beyond pagination
            // Based on the code, 'page' and 'limit' are the primary query params affecting the result set.
            return `campaign:${campaignId}:killmails:page:${page}:limit:${limit}`;
        },
    }
);
