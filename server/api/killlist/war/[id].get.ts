import { KillmailService } from "~/server/services";

export default defineCachedEventHandler(
    async (event: any) => {
        const warId = Number(event.context.params?.id);
        const query = getQuery(event);

        let page: number = Number(query.page) || 1;
        let limit: number = Number(query.limit) || 50;
        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 1000) limit = 1000;

        if (!warId || isNaN(warId)) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid war ID",
            });
        }

        try {
            const skip = (page - 1) * limit;

            // Get killmails using KillmailService
            const killmails = await KillmailService.findByWar(
                warId,
                limit,
                skip
            );

            // Format killmails for response
            const result = killmails.map((killmail: any) => {
                // Parse attackers JSON field
                const attackers =
                    typeof killmail.attackers === "string"
                        ? JSON.parse(killmail.attackers)
                        : killmail.attackers || [];

                const finalBlowAttacker = attackers.find(
                    (a: any) => a.final_blow
                );

                return {
                    killmail_id: killmail.killmail_id,
                    total_value: killmail.total_value,
                    system_id: killmail.solar_system_id,
                    system_name: killmail.solar_system_name,
                    system_security: killmail.system_security,
                    region_id: killmail.region_id,
                    region_name: killmail.region_name,
                    kill_time: killmail.killmail_time,
                    attackerCount: attackers.length,
                    commentCount: 0,
                    is_npc: killmail.is_npc,
                    is_solo: killmail.is_solo,
                    victim: {
                        ship_id: killmail.ship_type_id,
                        ship_name: killmail.ship_name,
                        ship_group_name: killmail.ship_group_name,
                        character_id: killmail.victim_character_id,
                        character_name: killmail.victim_character_name,
                        corporation_id: killmail.victim_corporation_id,
                        corporation_name: killmail.victim_corporation_name,
                        alliance_id: killmail.victim_alliance_id,
                        alliance_name: killmail.victim_alliance_name,
                        faction_id: killmail.victim_faction_id,
                        faction_name: killmail.victim_faction_name,
                    },
                    finalblow: {
                        character_id: finalBlowAttacker?.character_id,
                        character_name: finalBlowAttacker?.character_name,
                        corporation_id: finalBlowAttacker?.corporation_id,
                        corporation_name: finalBlowAttacker?.corporation_name,
                        alliance_id: finalBlowAttacker?.alliance_id,
                        alliance_name: finalBlowAttacker?.alliance_name,
                        faction_id: finalBlowAttacker?.faction_id,
                        faction_name: finalBlowAttacker?.faction_name,
                        ship_group_name: finalBlowAttacker?.ship_group_name,
                    },
                };
            });

            return result;
        } catch (error) {
            console.error("War killlist API error:", error);
            throw createError({
                statusCode: 500,
                statusMessage: "Failed to fetch war killmails",
            });
        }
    },
    {
        maxAge: 30,
        staleMaxAge: 0,
        swr: true,
        base: "redis",
        getKey: (event: any) => {
            const warId = event.context.params?.id;
            const query = getQuery(event);
            const page = query?.page ? query.page.toString() : "1";
            const limit = query?.limit ? query.limit.toString() : "50";
            return `killlist:war:${warId}:page:${page}:limit:${limit}`;
        },
    }
);
