import prisma from "~/lib/prisma";
import {
    AllianceService,
    CharacterService,
    CorporationService,
} from "~/server/services";

export default defineEventHandler(async (event) => {
    // Authenticate and verify admin privileges
    await requireAdminAuth(event);

    const characterId = event.context.params?.characterId;

    if (!characterId || isNaN(Number(characterId))) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid character ID",
        });
    }

    try {
        // Get user with full key information
        const user = await prisma.user.findUnique({
            where: { character_id: Number(characterId) },
            select: {
                character_id: true,
                scopes: true,
                token_type: true,
                date_expiration: true,
                last_checked: true,
                can_fetch_corporation_killmails: true,
                role: true,
                unique_identifier: true,
                created_at: true,
                updated_at: true,
                esi_active: true,
            },
        });

        if (!user) {
            throw createError({
                statusCode: 404,
                statusMessage: "ESI key not found for this character",
            });
        }

        // Get character information
        const character = await CharacterService.findWithRelations(
            Number(characterId)
        );

        // Get corporation information if available
        let corporation = null;
        if (character?.corporation_id) {
            corporation = await CorporationService.findById(
                character.corporation_id
            );
        }

        // Get alliance information if available
        let alliance = null;
        if (character?.alliance_id) {
            alliance = await AllianceService.findById(character.alliance_id);
        }

        // Process scopes for better display
        const scopesList: string[] = Array.isArray(user.scopes)
            ? (user.scopes as string[])
            : typeof user.scopes === "string"
            ? (user.scopes as string).split(" ").filter(Boolean)
            : [];

        // Categorize scopes for better presentation
        const scopeCategories = {
            character: scopesList.filter((scope: string) =>
                scope.includes("characters")
            ),
            corporation: scopesList.filter((scope: string) =>
                scope.includes("corporations")
            ),
            alliance: scopesList.filter((scope: string) =>
                scope.includes("alliances")
            ),
            killmails: scopesList.filter((scope: string) =>
                scope.includes("killmails")
            ),
            assets: scopesList.filter((scope: string) =>
                scope.includes("assets")
            ),
            wallet: scopesList.filter((scope: string) =>
                scope.includes("wallet")
            ),
            skills: scopesList.filter((scope: string) =>
                scope.includes("skills")
            ),
            location: scopesList.filter((scope: string) =>
                scope.includes("location")
            ),
            mail: scopesList.filter((scope: string) => scope.includes("mail")),
            other: scopesList.filter(
                (scope: string) =>
                    !scope.includes("characters") &&
                    !scope.includes("corporations") &&
                    !scope.includes("alliances") &&
                    !scope.includes("killmails") &&
                    !scope.includes("assets") &&
                    !scope.includes("wallet") &&
                    !scope.includes("skills") &&
                    !scope.includes("location") &&
                    !scope.includes("mail")
            ),
        };

        // Calculate key status
        const now = new Date();
        const expirationDate = new Date(user.date_expiration);
        const isExpired = expirationDate < now;
        const daysSinceLastCheck = Math.floor(
            (now.getTime() - new Date(user.last_checked).getTime()) /
                (1000 * 60 * 60 * 24)
        );
        const daysUntilExpiration = Math.floor(
            (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
            success: true,
            data: {
                key: {
                    characterId: user.character_id,
                    characterName: character?.name || "",
                    tokenType: user.token_type,
                    dateExpiration: user.date_expiration,
                    lastChecked: user.last_checked,
                    canFetchCorporationKillmails:
                        user.can_fetch_corporation_killmails,
                    administrator: user.role === "admin",
                    uniqueIdentifier: user.unique_identifier,
                    createdAt: user.created_at,
                    updatedAt: user.updated_at,
                    isExpired,
                    daysSinceLastCheck,
                    daysUntilExpiration,
                },
                scopes: {
                    total: scopesList.length,
                    categories: scopeCategories,
                    raw: scopesList,
                },
                character: character
                    ? {
                          id: character.character_id,
                          name: character.name,
                          corporationId: character.corporation_id,
                          allianceId: character.alliance_id,
                          securityStatus: character.security_status,
                          birthday: character.birthday,
                      }
                    : null,
                corporation: corporation
                    ? {
                          id: corporation.corporation_id,
                          name: corporation.name,
                          ticker: corporation.ticker,
                          memberCount: corporation.member_count,
                          allianceId: corporation.alliance_id,
                      }
                    : null,
                alliance: alliance
                    ? {
                          id: alliance.alliance_id,
                          name: alliance.name,
                          ticker: alliance.ticker,
                      }
                    : null,
            },
        };
    } catch (error) {
        console.error("Error fetching ESI key details:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to fetch ESI key details",
        });
    }
});
