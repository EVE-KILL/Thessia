export default defineCachedEventHandler(
    async (event) => {
        const corporationId: number | null = event.context.params?.id
            ? Number.parseInt(event.context.params.id)
            : null;
        if (!corporationId) {
            return { error: "Corporation ID not provided" };
        }

        const corporation = await getCorporation(corporationId);
        let history = corporation.history
            ? corporation.history.reverse()
            : null;
        if (history === null) {
            return { error: "Corporation history not found" };
        }

        if (history.length === 0) {
            queueUpdateCorporationHistory(corporationId, 1);
            return { error: "Corporation history not found" };
        }

        // Create a map of the history of a corporation, calculating when the corporation joined and left an alliance.
        // Each record has a start_date, so we can calculate the end_date by looking at the next record.
        if (!history) {
            // Should be redundant due to earlier checks, but to satisfy TS
            return { error: "Corporation history became null unexpectedly" };
        }
        const processedHistory = history.map((corp, index) => {
            const nextRecord = history[index + 1];
            return {
                record_id: corp.record_id,
                alliance_id: corp.alliance_id,
                start_date: corp.start_date,
                end_date: nextRecord ? nextRecord.start_date : null,
            };
        });

        const result = processedHistory.map(async (corp: any) => {
            let allianceInfo = null;
            if (corp.alliance_id) {
                allianceInfo = await getAlliance(corp.alliance_id); // Added await here
            }

            return {
                record_id: corp.record_id,
                alliance_id: corp.alliance_id || 0,
                alliance_name: allianceInfo?.name || "",
                start_date: corp.start_date,
                end_date: corp.end_date,
            };
        });

        return (await Promise.all(result)).reverse();
    },
    {
        maxAge: 3600,
        staleMaxAge: -1,
        swr: true,
        getKey: (event) => {
            const idParam = event.context.params?.id;
            return `corporations:${idParam}:alliancehistory`;
        },
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
    }
);
