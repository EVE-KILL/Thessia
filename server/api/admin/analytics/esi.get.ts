export default defineEventHandler(async (event) => {
    // Authenticate and verify admin privileges
    await requireAdminAuth(event);

    const query = getQuery(event);
    const searchTerm = (query.search as string) || "";

    // Get all users with their basic info
    const users = await Users.find(
        {},
        {
            characterId: 1,
            characterName: 1,
            scopes: 1,
            canFetchCorporationKillmails: 1,
            administrator: 1,
        }
    ).lean();

    // Get all unique character IDs
    const characterIds = users.map((user) => user.characterId);

    // Get character data with corporation and alliance info
    const characters = await Characters.find(
        { character_id: { $in: characterIds } },
        {
            character_id: 1,
            name: 1,
            corporation_id: 1,
            alliance_id: 1,
        }
    ).lean();

    // Get all unique corporation and alliance IDs
    const corporationIds = [
        ...new Set(
            characters.map((char) => char.corporation_id).filter(Boolean)
        ),
    ];
    const allianceIds = [
        ...new Set(characters.map((char) => char.alliance_id).filter(Boolean)),
    ];

    // Get corporation and alliance data
    const [corporations, alliances] = await Promise.all([
        Corporations.find(
            { corporation_id: { $in: corporationIds } },
            {
                corporation_id: 1,
                name: 1,
                alliance_id: 1,
                member_count: 1,
            }
        ).lean(),
        Alliances.find(
            { alliance_id: { $in: allianceIds } },
            {
                alliance_id: 1,
                name: 1,
            }
        ).lean(),
    ]);

    // Get total corporation counts per alliance
    const allianceCorporationCounts = await Corporations.aggregate([
        {
            $match: {
                alliance_id: { $in: allianceIds },
            },
        },
        {
            $group: {
                _id: "$alliance_id",
                totalCorporations: { $sum: 1 },
            },
        },
    ]);

    // Get all corporations in alliances (for missing corp calculations)
    const allAllianceCorporations = await Corporations.find(
        { alliance_id: { $in: allianceIds } },
        {
            corporation_id: 1,
            name: 1,
            alliance_id: 1,
            member_count: 1,
        }
    ).lean();

    // Create alliance corporation count map
    const allianceCorpCountMap = new Map(
        allianceCorporationCounts.map((item) => [
            item._id,
            item.totalCorporations,
        ])
    );

    // Group all corporations by alliance
    const corporationsByAlliance = new Map();
    allAllianceCorporations.forEach((corp) => {
        if (!corporationsByAlliance.has(corp.alliance_id)) {
            corporationsByAlliance.set(corp.alliance_id, []);
        }
        corporationsByAlliance.get(corp.alliance_id).push(corp);
    });

    // Create lookup maps
    const characterMap = new Map(
        characters.map((char) => [char.character_id, char])
    );
    const corporationMap = new Map(
        corporations.map((corp) => [corp.corporation_id, corp])
    );
    const allianceMap = new Map(
        alliances.map((alliance) => [alliance.alliance_id, alliance])
    );

    // Process users and build analytics data
    const userAnalytics = users.map((user) => {
        const character = characterMap.get(user.characterId);
        const corporation = character
            ? corporationMap.get(character.corporation_id)
            : null;
        const alliance = character?.alliance_id
            ? allianceMap.get(character.alliance_id)
            : null;

        return {
            characterId: user.characterId,
            characterName: user.characterName,
            scopes: user.scopes,
            scopesCount:
                typeof user.scopes === "string"
                    ? (user.scopes as string).trim()
                        ? (user.scopes as string).split(" ").length
                        : 0
                    : Array.isArray(user.scopes)
                    ? user.scopes.length
                    : 0,
            canFetchCorporationKillmails: user.canFetchCorporationKillmails,
            administrator: user.administrator,
            corporation: corporation
                ? {
                      id: corporation.corporation_id,
                      name: corporation.name,
                      memberCount: corporation.member_count || 0,
                      allianceId: corporation.alliance_id,
                  }
                : null,
            alliance: alliance
                ? {
                      id: alliance.alliance_id,
                      name: alliance.name,
                  }
                : null,
        };
    });

    // Build corporation analytics
    const corporationAnalytics = new Map();
    userAnalytics.forEach((user) => {
        if (user.corporation) {
            const corpId = user.corporation.id;
            if (!corporationAnalytics.has(corpId)) {
                corporationAnalytics.set(corpId, {
                    ...user.corporation,
                    keyCount: 0,
                    users: [],
                    hasCorpKeys: false,
                });
            }
            const corp = corporationAnalytics.get(corpId);
            corp.keyCount++;
            corp.users.push({
                characterId: user.characterId,
                characterName: user.characterName,
                scopesCount: user.scopesCount,
                canFetchCorporationKillmails: user.canFetchCorporationKillmails,
            });
            if (user.canFetchCorporationKillmails) {
                corp.hasCorpKeys = true;
            }
        }
    });

    // Build alliance analytics
    const allianceAnalytics = new Map();
    userAnalytics.forEach((user) => {
        if (user.alliance) {
            const allianceId = user.alliance.id;
            if (!allianceAnalytics.has(allianceId)) {
                allianceAnalytics.set(allianceId, {
                    ...user.alliance,
                    totalCorporations:
                        allianceCorpCountMap.get(allianceId) || 0,
                    corporationsWithKeys: 0,
                    totalKeys: 0,
                    corporations: new Map(),
                });
            }
            const alliance = allianceAnalytics.get(allianceId);
            alliance.totalKeys++;

            // Track corporations in this alliance that have keys
            if (user.corporation) {
                const corpId = user.corporation.id;
                if (!alliance.corporations.has(corpId)) {
                    alliance.corporations.set(corpId, {
                        ...user.corporation,
                        keyCount: 0,
                        hasCorpKeys: false,
                        users: [],
                    });
                }
                const corp = alliance.corporations.get(corpId);
                corp.keyCount++;
                corp.users.push({
                    characterId: user.characterId,
                    characterName: user.characterName,
                    scopesCount: user.scopesCount,
                    canFetchCorporationKillmails:
                        user.canFetchCorporationKillmails,
                });
                if (user.canFetchCorporationKillmails && !corp.hasCorpKeys) {
                    corp.hasCorpKeys = true;
                    alliance.corporationsWithKeys++;
                }
            }
        }
    });

    // Convert to arrays and calculate percentages
    const corporationsList = Array.from(corporationAnalytics.values());
    const alliancesList = Array.from(allianceAnalytics.values()).map(
        (alliance: any) => {
            const allCorpsInAlliance =
                corporationsByAlliance.get(alliance.id) || [];
            const corpsWithKeys = Array.from(alliance.corporations.values());

            // Find missing corporations (those in alliance but without keys)
            const missingCorporations = allCorpsInAlliance
                .filter(
                    (corp: any) =>
                        !alliance.corporations.has(corp.corporation_id)
                )
                .map((corp: any) => ({
                    id: corp.corporation_id,
                    name: corp.name,
                    memberCount: corp.member_count || 0,
                    allianceId: corp.alliance_id,
                    keyCount: 0,
                    hasCorpKeys: false,
                }))
                .sort((a: any, b: any) => b.memberCount - a.memberCount); // Sort by member count descending

            return {
                ...alliance,
                completionPercentage:
                    alliance.totalCorporations > 0
                        ? Math.round(
                              (alliance.corporationsWithKeys /
                                  alliance.totalCorporations) *
                                  100
                          )
                        : 0,
                corporations: corpsWithKeys,
                missingCorporations: missingCorporations,
            };
        }
    );

    // Apply search filter if provided
    let filteredCorporations = corporationsList;
    let filteredAlliances = alliancesList;

    if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        filteredCorporations = corporationsList.filter((corp) =>
            corp.name.toLowerCase().includes(searchLower)
        );
        filteredAlliances = alliancesList.filter((alliance) =>
            alliance.name.toLowerCase().includes(searchLower)
        );
    }

    // Calculate new killmails from ESI in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newKillmailsResult = await ESILogs.aggregate([
        {
            $match: {
                timestamp: { $gte: thirtyDaysAgo },
                dataType: { $in: ["killmails", "corporation_killmails"] },
                newItemsCount: { $gt: 0 },
            },
        },
        {
            $group: {
                _id: null,
                totalNewKillmails: { $sum: "$newItemsCount" },
            },
        },
    ]);

    const newKillmailsLast30Days =
        newKillmailsResult.length > 0
            ? newKillmailsResult[0].totalNewKillmails
            : 0;

    // Calculate summary statistics
    const summary = {
        totalKeys: users.length,
        totalCorporationKeys: userAnalytics.filter(
            (user) => user.canFetchCorporationKillmails
        ).length,
        uniqueCorporations: corporationsList.length,
        uniqueAlliances: alliancesList.length,
        corporationsWithKeys: corporationsList.filter(
            (corp) => corp.hasCorpKeys
        ).length,
        alliancesWithKeys: alliancesList.filter(
            (alliance) => alliance.corporationsWithKeys > 0
        ).length,
        membersCovered: corporationsList
            .filter((corp) => corp.hasCorpKeys)
            .reduce((total, corp) => total + (corp.memberCount || 0), 0),
        newKillmailsLast30Days: newKillmailsLast30Days,
    };

    return {
        success: true,
        data: {
            summary,
            corporations: filteredCorporations.sort(
                (a, b) => b.keyCount - a.keyCount
            ),
            alliances: filteredAlliances.sort(
                (a, b) => b.totalKeys - a.totalKeys
            ),
            searchTerm: searchTerm.trim() || null,
        },
    };
});
