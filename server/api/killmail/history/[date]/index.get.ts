export default defineCachedEventHandler(async (event) => {
    const dateInput = event.context.params?.date as string;
    const startDate = new Date(dateInput);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const killmails = await Killmails.find(
        {
            kill_time: {
                $gte: startDate,
                $lt: endDate,
            },
        },
        {
            _id: 0,
            killmail_id: 1,
            killmail_hash: 1,
        },
    );

    // Return { killmail_id: killmail_hash, ... }
    const kms: { [key: string]: string } = {};
    for (const killmail of killmails) {
        kms[killmail.killmail_id] = killmail.killmail_hash;
    }

    return kms;
}, {
    maxAge: 300,
    staleMaxAge: -1,
    swr: true,
    base: "redis",
    getKey: (event) => {
        const dateParam = event.context.params?.date as string;
        return `killmail:history:${dateParam}`;
    },
    shouldBypassCache: (event) => {
        return process.env.NODE_ENV !== "production";
    }
});
