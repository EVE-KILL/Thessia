import { defineEventHandler, getRouterParam } from "h3";

export default defineEventHandler(async (event) => {
    console.log("=== DOMAIN TEST HANDLER HIT ===");
    console.log(`Method: ${event.node.req.method}`);
    console.log(`URL: ${event.node.req.url}`);

    const domain = getRouterParam(event, "domain");
    console.log(`Domain extracted: "${domain}"`);

    return {
        success: true,
        message: "Domain test handler working",
        method: event.node.req.method,
        url: event.node.req.url,
        domain: domain,
    };
});
