import {
    createError,
    defineEventHandler,
    getRouterParam,
    readRawBody,
} from "h3";

export default defineEventHandler(async (event) => {
    const domain = getRouterParam(event, "domain");

    if (!domain) {
        throw createError({
            statusCode: 400,
            statusMessage: "Domain parameter is required",
        });
    }

    try {
        // Use raw body parsing to avoid h3's comment-sensitive JSON parser
        const rawBody = await readRawBody(event);

        if (!rawBody) {
            throw new Error("Empty request body");
        }

        // Convert to string and parse JSON manually
        const bodyString =
            typeof rawBody === "string"
                ? rawBody
                : new TextDecoder().decode(rawBody);
        const body = JSON.parse(bodyString);

        return {
            success: true,
            message: "Template parsing successful",
            receivedFields: Object.keys(body),
        };
    } catch (error: any) {
        throw createError({
            statusCode: 400,
            statusMessage: "Failed to parse request: " + error.message,
        });
    }
});
