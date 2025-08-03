interface QueryConfig {
    find: Record<string, unknown>;
    sort?: Record<string, 1 | -1>;
    projection?: Record<string, 0 | 1>;
    hint?: string;
}

const killlistQueries: Record<string, QueryConfig> = {
    latest: {
        find: {},
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
        hint: "kill_time_-1",
    },
    abyssal: {
        find: { region_id: { $gte: 12000000, $lte: 13000000 } },
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
        hint: "region_id_kill_time",
    },
    wspace: {
        find: { region_id: { $gte: 11000001, $lte: 11000033 } },
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
        hint: "region_id_kill_time",
    },
    highsec: {
        find: { system_security: { $gte: 0.45 } },
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
        hint: "system_security_kill_time",
    },
    lowsec: {
        find: { system_security: { $lte: 0.45, $gte: 0 } },
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
        hint: "system_security_lowsec_kill_time_-1",
    },
    nullsec: {
        find: { system_security: { $lte: 0 } },
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
        hint: "system_security_nullsec_kill_time_-1",
    },
    pochven: {
        find: { region_id: 10000070 },
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
        hint: "region_id_kill_time",
    },
    big: {
        find: {
            "victim.ship_group_id": { $in: [547, 485, 513, 902, 941, 30, 659] },
        },
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
        hint: "victim.ship_group_id_big_kill_time_-1",
    },
    solo: {
        find: { is_solo: true },
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
        hint: "is_solo_kill_time",
    },
    npc: {
        find: { is_npc: true },
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
        hint: "is_npc_kill_time",
    },
    "5b": {
        find: { total_value: { $gte: 5000000000 } },
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
        hint: "total_value_kill_time",
    },
    "10b": {
        find: { total_value: { $gte: 10000000000 } },
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
        hint: "total_value_kill_time",
    },
    citadels: {
        find: {
            "victim.ship_group_id": {
                $in: [1657, 1406, 1404, 1408, 2017, 2016],
            },
        },
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
        hint: "victim.ship_group_id_citadel_kill_time_-1",
    },
    t1: {
        find: {
            "victim.ship_group_id": {
                $in: [419, 27, 29, 547, 26, 420, 25, 28, 941, 463, 237, 31],
            },
        },
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
        hint: "victim.ship_group_id_t1_kill_time_-1",
    },
    t2: {
        find: {
            "victim.ship_group_id": {
                $in: [
                    324, 898, 906, 540, 830, 893, 543, 541, 833, 358, 894, 831,
                    902, 832, 900, 834, 380,
                ],
            },
        },
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
        hint: "victim.ship_group_id_t2_kill_time_-1",
    },
    t3: {
        find: { "victim.ship_group_id": { $in: [963, 1305] } },
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
        hint: "victim.ship_group_id_t3_kill_time_-1",
    },
    frigates: {
        find: { "victim.ship_group_id": { $in: [324, 893, 25, 831, 237] } },
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
        hint: "victim.ship_group_id_frigate_kill_time_-1",
    },
    destroyers: {
        find: { "victim.ship_group_id": { $in: [420, 541] } },
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
        hint: "victim.ship_group_id_destroyer_kill_time_-1",
    },
    cruisers: {
        find: {
            "victim.ship_group_id": { $in: [906, 26, 833, 358, 894, 832, 963] },
        },
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
        hint: "victim.ship_group_id_cruiser_kill_time_-1",
    },
    battlecruisers: {
        find: { "victim.ship_group_id": { $in: [419, 540] } },
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
        hint: "victim.ship_group_id_battlecruiser_kill_time_-1",
    },
    battleships: {
        find: { "victim.ship_group_id": { $in: [27, 898, 900] } },
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
        hint: "victim.ship_group_id_battleship_kill_time_-1",
    },
    capitals: {
        find: { "victim.ship_group_id": { $in: [547, 485] } },
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
        hint: "victim.ship_group_id_capital_kill_time_-1",
    },
    freighters: {
        find: { "victim.ship_group_id": { $in: [513, 902] } },
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
        hint: "victim.ship_group_id_freighter_kill_time_-1",
    },
    supercarriers: {
        find: { "victim.ship_group_id": { $in: [659] } },
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
        hint: "victim.ship_group_id_supercarrier_kill_time_-1",
    },
    titans: {
        find: { "victim.ship_group_id": { $in: [30] } },
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
        hint: "victim.ship_group_id_titan_kill_time_-1",
    },
    structureboys: {
        find: {
            "items.type_id": {
                $in: [56201, 56202, 56203, 56204, 56205, 56206, 56207, 56208],
            },
            "items.flag": 5,
        },
        sort: { kill_time: -1 },
        projection: { _id: 0, items: 0 },
    },
};

export default defineCachedEventHandler(
    async (event) => {
        const query = getQuery(event);
        const type = (query.type as string) || "latest";
        const page = Number.parseInt((query.page as string) || "1", 10);
        // Get the limit from the query, default to 100 - but also check if it's a number - it can minimum be 1 and maximum 1000 - if it goes beyond those reset it to 1 or 1000
        let limit = Number.parseInt((query.limit as string) || "100", 10);
        if (Number.isNaN(limit) || limit < 1) {
            limit = 1;
        } else if (limit > 1000) {
            limit = 1000;
        }
        const skip = (page - 1) * limit;

        const config = killlistQueries[type];

        if (!config) {
            return { error: `Invalid type provided: ${type}` };
        }

        const projection = config.projection || {};

        // Create cursor for streaming killmails
        let cursor = Killmails.find(config.find, projection as any, {
            sort: config.sort || { kill_time: -1 },
            skip: skip,
            limit: limit,
            hint: config.hint || "kill_time_-1",
        });

        // Stream through killmails using cursor and format on-the-fly
        const result: any[] = [];
        for await (const killmail of cursor) {
            const finalBlowAttacker = killmail.attackers.find(
                (a: any) => a.final_blow
            );

            result.push({
                killmail_id: killmail.killmail_id,
                total_value: killmail.total_value,
                system_id: killmail.system_id,
                system_name: killmail.system_name,
                system_security: killmail.system_security,
                region_id: killmail.region_id,
                region_name: killmail.region_name,
                kill_time: killmail.kill_time,
                attackerCount: killmail.attackers.length,
                commentCount: 0,
                is_npc: killmail.is_npc,
                is_solo: killmail.is_solo,
                victim: {
                    ship_id: killmail.victim.ship_id,
                    ship_name: killmail.victim.ship_name,
                    ship_group_name: killmail.victim.ship_group_name,
                    character_id: killmail.victim.character_id,
                    character_name: killmail.victim.character_name,
                    corporation_id: killmail.victim.corporation_id,
                    corporation_name: killmail.victim.corporation_name,
                    alliance_id: killmail.victim.alliance_id,
                    alliance_name: killmail.victim.alliance_name,
                    faction_id: killmail.victim.faction_id,
                    faction_name: killmail.victim.faction_name,
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
            });
        }

        return result;
    },
    {
        maxAge: 30,
        staleMaxAge: 0,
        swr: true,
        base: "redis",
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
        getKey: (event) => {
            const query = getQuery(event);
            const type = (query.type as string) || "latest";
            const page = (query.page as string) || "1";
            const limit = (query.limit as string) || "100";
            return `killlist:index:type:${type}:page:${page}:limit:${limit}`;
        },
    }
);
