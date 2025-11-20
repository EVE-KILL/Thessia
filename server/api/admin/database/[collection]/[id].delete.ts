import prisma from "~/lib/prisma";

const TABLE_MAP: Record<string, string> = {
    alliances: "alliances",
    battles: "battles",
    bloodlines: "bloodlines",
    campaigns: "campaigns",
    celestials: "celestials",
    characterachievements: "character_achievements",
    characters: "characters",
    comments: "comments",
    config: "config",
    constellations: "constellations",
    corporations: "corporations",
    customprices: "custom_prices",
    dscan: "dscan",
    esilogs: "esi_logs",
    factions: "factions",
    historicalstats: "historical_stats",
    invflags: "inv_flags",
    invgroups: "inv_groups",
    invtypes: "inv_types",
    killmails: "killmails",
    killmailsesi: "killmails_esi",
    localscan: "local_scan",
    prices: "prices",
    races: "races",
    regions: "regions",
    savedquery: "saved_query",
    solarsystems: "solar_systems",
    stats: "stats",
    users: "users",
    wars: "wars",
};

export default defineEventHandler(async (event) => {
    await requireAdminAuth(event);

    const collectionName = getRouterParam(event, "collection")?.toLowerCase();
    const table = collectionName ? TABLE_MAP[collectionName] : null;
    const id = getRouterParam(event, "id");

    if (!table || !id) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid collection or id",
        });
    }

    try {
        await prisma.$executeRawUnsafe(
            `DELETE FROM ${table} WHERE id = ${Number(id)}`
        );
        return { success: true, message: "Document deleted successfully" };
    } catch (error) {
        return {
            success: false,
            message: "Failed to delete document",
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
});
