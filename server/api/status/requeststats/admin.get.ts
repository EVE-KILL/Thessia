import { RequestStats } from "~/server/models/RequestStats";
import { Users } from "~/server/models/Users";

export default defineEventHandler(async (event) => {
  try {
    // Add cache-control headers to prevent caching
    setResponseHeaders(event, {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    // Get the cookie value using the hardcoded cookie name
    const cookieName = 'evelogin';
    const cookie = getCookie(event, cookieName);

    if (!cookie) {
      throw createError({
        statusCode: 403,
        statusMessage: "Unauthorized access - administrator rights required"
      });
    }

    // Find the user by uniqueIdentifier
    const user = await Users.findOne({ uniqueIdentifier: cookie });

    if (!user || !user.administrator) {
      throw createError({
        statusCode: 403,
        statusMessage: "Unauthorized access - administrator rights required"
      });
    }

    // Get query parameters
    const query = getQuery(event);
    const period = query.period?.toString() || '24hours';
    const limit = parseInt(query.limit?.toString() || '1000', 10);
    
    // Determine time range based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
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

    // Fetch complete raw request data from MongoDB - no masking
    const rawStats = await RequestStats.find(
      { timestamp: { $gte: startDate } },
      null,
      { sort: { timestamp: -1 }, limit }
    ).lean();
    
    // Return full details for admin view
    return {
      detailedRequests: rawStats.map(req => ({
        ...req,
        timestamp: new Date(req.timestamp).toISOString()
      }))
    };
    
  } catch (error) {
    console.error('Error fetching admin request statistics:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Error fetching admin request statistics'
    });
  }
});
