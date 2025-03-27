import { RequestStats } from "~/server/models/RequestStats";
import { RedisStorage } from "~/server/helpers/Storage";

export default defineEventHandler(async (event) => {
  try {
    // Get query parameters
    const query = getQuery(event);
    const period = query.period?.toString() || '24hours';
    const limit = parseInt(query.limit?.toString() || '1000', 10);
    const requestType = query.type?.toString() || 'all'; // Can be 'all', 'web', 'api'

    // Determine time range based on period
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case '5min':
        startDate.setMinutes(now.getMinutes() - 5);
        break;
      case '10min':
        startDate.setMinutes(now.getMinutes() - 10);
        break;
      case '30min':
        startDate.setMinutes(now.getMinutes() - 30);
        break;
      case '1hour':
        startDate.setHours(now.getHours() - 1);
        break;
      case '6hours':
        startDate.setHours(now.getHours() - 6);
        break;
      case '12hours':
        startDate.setHours(now.getHours() - 12);
        break;
      case '24hours':
      default:
        startDate.setDate(now.getDate() - 1);
        break;
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
    }

    // Base query for time range
    const baseQuery = { timestamp: { $gte: startDate } };

    // Add filter based on request type
    let typeFilter = {};
    if (requestType === 'web') {
      typeFilter = { isApi: false };
    } else if (requestType === 'api') {
      typeFilter = { isApi: true };
    }

    // Combine filters
    const finalQuery = { ...baseQuery, ...typeFilter };

    // Check if we have cached results to avoid excessive database queries
    const cacheKey = `requeststats:${period}:${limit}:${requestType}`;
    const cache = RedisStorage.getInstance().getClient();
    const cachedData = await cache.get(cacheKey);

    if (cachedData) {
      return JSON.parse(cachedData);
    }

    // Fetch raw request data from MongoDB
    const rawStats = await RequestStats.find(
      finalQuery,
      null,
      { sort: { timestamp: -1 }, limit }
    ).lean();

    // Get total counts
    const totalRequests = await RequestStats.countDocuments(finalQuery);
    const totalWebRequests = await RequestStats.countDocuments({ ...baseQuery, isApi: false });
    const totalApiRequests = await RequestStats.countDocuments({ ...baseQuery, isApi: true });

    // Aggregate statistics
    const pageViews = await RequestStats.aggregate([
      { $match: finalQuery },
      { $group: { _id: '$url', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    const browserStats = await RequestStats.aggregate([
      { $match: finalQuery },
      { $group: { _id: '$browser', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const osStats = await RequestStats.aggregate([
      { $match: finalQuery },
      { $group: { _id: '$os', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const deviceStats = await RequestStats.aggregate([
      { $match: finalQuery },
      { $group: { _id: '$device', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const statusCodeStats = await RequestStats.aggregate([
      { $match: finalQuery },
      { $group: { _id: '$statusCode', count: { $sum: 1 } } },
      { $sort: { _id: 1 } } // Sort by status code ascending
    ]);

    const hourlyStats = await RequestStats.aggregate([
      { $match: finalQuery },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
            hour: { $hour: '$timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ]);

    // Format the hourly stats for charting
    const timeData = hourlyStats.map(item => {
      const date = new Date(
        item._id.year,
        item._id.month - 1,
        item._id.day,
        item._id.hour
      );
      return {
        time: date.toISOString(),
        count: item.count
      };
    });

    // Get top API endpoints (useful for API tab)
    const topApiEndpoints = await RequestStats.aggregate([
      { $match: { ...baseQuery, isApi: true } },
      { $group: { _id: '$url', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    // Get recent requests - for non-admin view (masked IP)
    const recentRequests = rawStats.slice(0, 100).map(req => {
      const { ip, userAgent, ...safeData } = req;
      return {
        ...safeData,
        ip: ip.split('.').slice(0, 2).join('.') + '.*.*', // Mask IP for privacy
        timestamp: new Date(req.timestamp).toISOString()
      };
    });

    const result = {
      totalRequests,
      totalWebRequests,
      totalApiRequests,
      requestType,
      pageViews: pageViews.map(item => ({ url: item._id, count: item.count })),
      browserStats: browserStats.map(item => ({ name: item._id, count: item.count })),
      osStats: osStats.map(item => ({ name: item._id, count: item.count })),
      deviceStats: deviceStats.map(item => ({ name: item._id, count: item.count })),
      statusCodeStats: statusCodeStats.map(item => ({ code: item._id, count: item.count })),
      topApiEndpoints: topApiEndpoints.map(item => ({ url: item._id, count: item.count })),
      timeData,
      recentRequests,
    };

    // Cache the results to avoid excessive database queries
    // Cache for 5 minutes
    await cache.set(cacheKey, JSON.stringify(result), 'EX', 300);

    return result;
  } catch (error) {
    console.error('Error fetching request statistics:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching request statistics'
    });
  }
});
