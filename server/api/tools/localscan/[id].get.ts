import { LocalScan } from '~/server/models/LocalScan';

export default defineEventHandler(async (event) => {
    try {
        const id = getRouterParam(event, 'id');

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
    } catch (error) {
        console.error('Error fetching LocalScan:', error);
        throw createError({
            statusCode: error.statusCode || 500,
            message: error.message || 'Failed to retrieve LocalScan data'
        });
    }
});
