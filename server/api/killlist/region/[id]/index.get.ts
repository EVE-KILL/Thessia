import { KillmailService } from "~/server/services";

export default defineCachedEventHandler(
    async (event: any) => {
        const query = getQuery(event);
        const id = event.context.params?.id;
        let page: number = Number(query.page) || 1;
        let limit: number = Number(query.limit) || 100;
        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 1000) limit = 1000;

        // Get killmails using KillmailService
        const killmails = await KillmailService.findByRegionDetailed(
            Number(id), 
            limit, 
            (page - 1) * limit
        );

        // Format killmails for response
        // NOTE: This is a simplified version - name fields need to be populated via additional joins
        const result = killmails.map((killmail: any) => {
            const finalBlowAttacker = killmail.attackers.find((a: any) => a.final_blow) || undefined;

            return {
                killmail_id: killmail.killmail_id,
                total_value: killmail.total_value,
                system_id: killmail.solar_system_id,
                system_name: killmail.solar_system?.system_name || '',
                system_security: killmail.solar_system?.security || 0,
                region_id: killmail.region_id,
                region_name: killmail.region?.region_name || '',
                constellation_id: killmail.constellation_id,
                constellation_name: killmail.constellation?.constellation_name || '',
                killmail_time: killmail.killmail_time,
                attackerCount: killmail.attackers.length,
                commentCount: 0,
                is_npc: false, // TODO: Calculate based on attacker data
                is_solo: killmail.attackers.length === 1,
                victim: {
                    ship_type_id: killmail.victim.ship_type_id,
                    character_id: killmail.victim.character_id,
                    corporation_id: killmail.victim.corporation_id,
                    alliance_id: killmail.victim.alliance_id,
                    // TODO: Add name fields via joins
                },
                finalblow: finalBlowAttacker ? {
                    character_id: finalBlowAttacker.character_id,
                    corporation_id: finalBlowAttacker.corporation_id,
                    alliance_id: finalBlowAttacker.alliance_id,
                    // TODO: Add name fields via joins
                } : null,
            };
        });

        return result;
    },
    {
        maxAge: 30,
        staleMaxAge: 0,
        swr: true,
        base: "redis",
        getKey: (event: any) => {
            const regionId = event.context.params?.id;
            const query = getQuery(event);
            const page = query?.page ? query.page.toString() : "1";
            const limit = query?.limit ? query.limit.toString() : "100";
            return `killlist:region:${regionId}:index:page:${page}:limit:${limit}`;
        },
    }
);
