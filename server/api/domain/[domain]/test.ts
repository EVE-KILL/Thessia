import { defineEventHandler, getRouterParam } from "h3";

export default defineEventHandler(async (event) => {
    const domain = getRouterParam(event, "domain");

    return {
        success: true,
        message: "Domain test handler working",
        method: event.node.req.method,
        url: event.node.req.url,
        domain: domain,
    };
});
