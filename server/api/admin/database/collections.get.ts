const collections = [
    "alliances",
    "battles",
    "bloodlines",
    "campaigns",
    "celestials",
    "characterachievements",
    "characters",
    "comments",
    "config",
    "constellations",
    "corporations",
    "customprices",
    "dscan",
    "esilogs",
    "factions",
    "historicalstats",
    "invflags",
    "invgroups",
    "invtypes",
    "killmails",
    "killmailsesi",
    "localscan",
    "prices",
    "races",
    "regions",
    "savedquery",
    "solarsystems",
    "stats",
    "users",
    "wars",
];

export default defineEventHandler(async (event) => {
    await requireAdminAuth(event);
    return {
        success: true,
        collections,
    };
});
