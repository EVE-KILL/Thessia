/**
 * Test endpoint to debug the entities route issue
 */
export default defineEventHandler(async (event) => {
    return {
        success: true,
        message: "Test endpoint is working",
        method: getMethod(event),
        domainId: getRouterParam(event, "domain_id"),
        path: getRequestURL(event).pathname,
    };
});
