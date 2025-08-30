import {
    createError,
    defineEventHandler,
    getRouterParam,
    readRawBody,
} from "h3";

export default defineEventHandler(async (event) => {
    console.log("=== TEMPLATE-SAVE HANDLER HIT ===");
    console.log(`Method: ${event.node.req.method}`);
    console.log(`URL: ${event.node.req.url}`);

    const domain = getRouterParam(event, "domain");
    console.log(`Domain extracted: "${domain}"`);

    if (!domain) {
        throw createError({
            statusCode: 400,
            statusMessage: "Domain parameter is required",
        });
    }

    try {
        // Use raw body parsing to avoid h3's comment-sensitive JSON parser
        const rawBody = await readRawBody(event);
        console.log("[Template Save] Raw body length:", rawBody?.length || 0);

        if (!rawBody) {
            throw new Error("Empty request body");
        }

        // Convert to string and parse JSON manually
        const bodyString =
            typeof rawBody === "string"
                ? rawBody
                : new TextDecoder().decode(rawBody);
        const body = JSON.parse(bodyString);

        console.log("[Template Save] Successfully parsed body:", {
            hasName: !!body.name,
            hasTemplate: !!body.template,
            templateLength: body.template?.length || 0,
            templatePreview: body.template?.substring(0, 100) || "",
            hasCss: !!body.customCss,
        });

        return {
            success: true,
            message: "Template parsing successful",
            receivedFields: Object.keys(body),
        };
    } catch (error: any) {
        console.log("[Template Save] Error:", error);
        throw createError({
            statusCode: 400,
            statusMessage: "Failed to parse request: " + error.message,
        });
    }
});
