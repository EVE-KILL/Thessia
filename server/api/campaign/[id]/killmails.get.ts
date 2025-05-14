import { createError, getQuery, getRouterParam } from 'h3';
import { buildExpandedQuery } from '~/server/helpers/CampaignsHelper';
import { type IKillList } from '~/server/interfaces/IKillList';
import { Campaigns } from '~/server/models/Campaigns';
import { Killmails } from '~/server/models/Killmails';

export default defineCachedEventHandler(async (event) => {
    const campaignId = getRouterParam(event, 'id');

    if (!campaignId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Campaign ID is required',
        });
    }

    try {
        // Get pagination parameters
        const query = getQuery(event);
        const page = parseInt(query.page as string) || 1;
        const limit = Math.min(parseInt(query.limit as string) || 25, 1000); // Allow up to 1000 killmails per request
        const skip = (page - 1) * limit;

        // Find the campaign
        const campaign = await Campaigns.findOne({ campaign_id: campaignId });

        if (!campaign) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Campaign not found',
            });
        }

        // Use the expanded query function from CampaignHelper
        const killmailQuery = buildExpandedQuery(campaign.query);

        // Get accurate total count (no limit)
        const countPromise = Killmails.countDocuments(killmailQuery);

        // Fetch the killmails with pagination
        const killmailsPromise = Killmails.find(
            killmailQuery,
            { _id: 0, items: 0 }, // Exclude _id and items for efficiency
            {
                sort: { kill_time: -1 }, // Newest first
                skip: skip,
                limit: limit + 1 // Get one extra to check if there are more
            }
        );

        // Execute both queries in parallel
        const [totalCount, allKillmails] = await Promise.all([countPromise, killmailsPromise]);

        // Check if there are more results
        const hasMore = allKillmails.length > limit;

        // Remove the extra item if there is one
        const killmails = hasMore ? allKillmails.slice(0, limit) : allKillmails;

        // Format killmails to match the format expected by the KillList component
        const formattedKillmails: IKillList[] = killmails.map(killmail => {
            // Find final blow attacker
            const finalBlowAttacker = killmail.attackers.find(a => a.final_blow) || killmail.attackers[0] || {};

            return {
                killmail_id: killmail.killmail_id,
                total_value: killmail.total_value,
                system_id: killmail.system_id,
                system_name: killmail.system_name,
                system_security: killmail.system_security,
                region_id: killmail.region_id,
                region_name: killmail.region_name,
                kill_time: killmail.kill_time,
                attackerCount: killmail.attackers.length,
                commentCount: 0, // Default to 0 for now
                is_npc: killmail.is_npc,
                is_solo: killmail.is_solo,
                victim: {
                    ship_id: killmail.victim.ship_id,
                    ship_name: killmail.victim.ship_name,
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
                    character_id: finalBlowAttacker.character_id || 0,
                    character_name: finalBlowAttacker.character_name || "",
                    corporation_id: finalBlowAttacker.corporation_id || 0,
                    corporation_name: finalBlowAttacker.corporation_name || "",
                    alliance_id: finalBlowAttacker.alliance_id || 0,
                    alliance_name: finalBlowAttacker.alliance_name || "",
                    faction_id: finalBlowAttacker.faction_id || 0,
                    faction_name: finalBlowAttacker.faction_name || "",
                    ship_group_name: finalBlowAttacker.ship_group_name || {},
                }
            };
        });

        // Return formatted killmails with pagination info including accurate total
        return {
            killmails: formattedKillmails,
            pagination: {
                page,
                limit,
                hasMore,
                total: totalCount // Return accurate total count, no artificial capping
            }
        };
    } catch (error: any) {
        console.error(`Error fetching killmails for campaign ${campaignId}:`, error);

        // Forward HTTP errors
        if (error.statusCode) {
            throw error;
        }

        // Otherwise, create a generic error
        throw createError({
            statusCode: 500,
            statusMessage: 'Error fetching campaign killmails',
            message: error.message || 'Error fetching campaign killmails',
        });
    }
}, {
    maxAge: 3600,
    staleMaxAge: -1,
    swr: true,
    base: "redis"
});
