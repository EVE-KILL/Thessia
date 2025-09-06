export default defineEventHandler(async (event) => {
    // Authenticate and verify admin privileges
    await requireAdminAuth(event);

    const characterId = event.context.params?.characterId;
    
    if (!characterId || isNaN(Number(characterId))) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid character ID"
        });
    }

    try {
        // Get user with full key information
        const user = await Users.findOne(
            { characterId: Number(characterId) },
            {
                characterId: 1,
                characterName: 1,
                scopes: 1,
                tokenType: 1,
                dateExpiration: 1,
                lastChecked: 1,
                canFetchCorporationKillmails: 1,
                administrator: 1,
                uniqueIdentifier: 1,
                createdAt: 1,
                updatedAt: 1
            }
        ).lean();

        if (!user) {
            throw createError({
                statusCode: 404,
                statusMessage: "ESI key not found for this character"
            });
        }

        // Get character information
        const character = await Characters.findOne(
            { character_id: Number(characterId) },
            {
                character_id: 1,
                name: 1,
                corporation_id: 1,
                alliance_id: 1,
                security_status: 1,
                birthday: 1
            }
        ).lean();

        // Get corporation information if available
        let corporation = null;
        if (character?.corporation_id) {
            corporation = await Corporations.findOne(
                { corporation_id: character.corporation_id },
                {
                    corporation_id: 1,
                    name: 1,
                    ticker: 1,
                    member_count: 1,
                    alliance_id: 1
                }
            ).lean();
        }

        // Get alliance information if available
        let alliance = null;
        if (character?.alliance_id) {
            alliance = await Alliances.findOne(
                { alliance_id: character.alliance_id },
                {
                    alliance_id: 1,
                    name: 1,
                    ticker: 1
                }
            ).lean();
        }

        // Process scopes for better display
        const scopesList: string[] = Array.isArray(user.scopes) ? user.scopes : 
                          typeof user.scopes === 'string' ? (user.scopes as string).split(' ').filter(Boolean) : [];

        // Categorize scopes for better presentation
        const scopeCategories = {
            character: scopesList.filter((scope: string) => scope.includes('characters')),
            corporation: scopesList.filter((scope: string) => scope.includes('corporations')),
            alliance: scopesList.filter((scope: string) => scope.includes('alliances')),
            killmails: scopesList.filter((scope: string) => scope.includes('killmails')),
            assets: scopesList.filter((scope: string) => scope.includes('assets')),
            wallet: scopesList.filter((scope: string) => scope.includes('wallet')),
            skills: scopesList.filter((scope: string) => scope.includes('skills')),
            location: scopesList.filter((scope: string) => scope.includes('location')),
            mail: scopesList.filter((scope: string) => scope.includes('mail')),
            other: scopesList.filter((scope: string) => 
                !scope.includes('characters') && 
                !scope.includes('corporations') && 
                !scope.includes('alliances') && 
                !scope.includes('killmails') && 
                !scope.includes('assets') && 
                !scope.includes('wallet') && 
                !scope.includes('skills') && 
                !scope.includes('location') && 
                !scope.includes('mail')
            )
        };

        // Calculate key status
        const now = new Date();
        const expirationDate = new Date(user.dateExpiration);
        const isExpired = expirationDate < now;
        const daysSinceLastCheck = Math.floor((now.getTime() - new Date(user.lastChecked).getTime()) / (1000 * 60 * 60 * 24));
        const daysUntilExpiration = Math.floor((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
            success: true,
            data: {
                key: {
                    characterId: user.characterId,
                    characterName: user.characterName,
                    tokenType: user.tokenType,
                    dateExpiration: user.dateExpiration,
                    lastChecked: user.lastChecked,
                    canFetchCorporationKillmails: user.canFetchCorporationKillmails,
                    administrator: user.administrator,
                    uniqueIdentifier: user.uniqueIdentifier,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                    isExpired,
                    daysSinceLastCheck,
                    daysUntilExpiration
                },
                scopes: {
                    total: scopesList.length,
                    categories: scopeCategories,
                    raw: scopesList
                },
                character: character ? {
                    id: character.character_id,
                    name: character.name,
                    corporationId: character.corporation_id,
                    allianceId: character.alliance_id,
                    securityStatus: character.security_status,
                    birthday: character.birthday
                } : null,
                corporation: corporation ? {
                    id: corporation.corporation_id,
                    name: corporation.name,
                    ticker: corporation.ticker,
                    memberCount: corporation.member_count,
                    allianceId: corporation.alliance_id
                } : null,
                alliance: alliance ? {
                    id: alliance.alliance_id,
                    name: alliance.name,
                    ticker: alliance.ticker
                } : null
            }
        };
    } catch (error) {
        console.error('Error fetching ESI key details:', error);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to fetch ESI key details"
        });
    }
});
