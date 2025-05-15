import { LocalScan } from '~/server/models/LocalScan';

export default defineCachedEventHandler(async (event) => {
    try {
        const id = event.context.params?.id;

        if (!id) {
            throw createError({
                statusCode: 400,
                message: 'Missing ID parameter'
            });
        }

        const data = await LocalScan.findOne({ hash: id }, {
            _id: 0,
            hash: 0,
            createdAt: 0,
            updatedAt: 0,
            __v: 0
        }).lean();

        if (!data) {
            throw createError({
                statusCode: 404,
                message: 'No data found for this ID'
            });
        }

        return data;
    } catch (error: any) {
        console.error('Error fetching LocalScan:', error);
        throw createError({
            statusCode: error.statusCode || 500,
            message: error.message || 'Failed to retrieve LocalScan data'
        });
    }
}, {
    maxAge: 86400, // Using a maxAge of 86400 seconds for static Local Scan results
    staleMaxAge: -1,
    swr: true,
    base: "redis", // Assuming redis is the default cache base
    shouldBypassCache: (event) => {
        return process.env.NODE_ENV !== "production";
    },
    getKey: (event) => {
        const localscanId = event.context.params?.id;
        // No query parameters are used in this handler, so the key only needs the ID.
        return `tools:localscan:${localscanId}`;
    }
});
