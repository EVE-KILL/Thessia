import { v4 as uuidv4 } from "uuid";

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const { redirect, scopes: customScopes, delay } = query;

    // Use direct environment variables instead of runtime config
    const clientId =
        process.env.NODE_ENV === "production"
            ? process.env.EVE_CLIENT_ID
            : process.env.EVE_CLIENT_ID_DEV;

    const callbackUrl =
        process.env.NODE_ENV === "production"
            ? process.env.EVE_CLIENT_REDIRECT
            : process.env.EVE_CLIENT_REDIRECT_DEV;

    if (!clientId || !callbackUrl) {
        throw createError({
            statusCode: 500,
            statusMessage: "Missing EVE SSO configuration",
        });
    }

    // Define default scopes
    const defaultScopes = [
        "publicData",
        "esi-killmails.read_killmails.v1",
        "esi-killmails.read_corporation_killmails.v1",
    ];

    // Handle custom scopes if provided, ensuring publicData is always included
    let requestedScopes: string[] = [];

    if (typeof customScopes === "string" && customScopes.length > 0) {
        requestedScopes = customScopes.split(",");
        // Ensure publicData is always included
        if (!requestedScopes.includes("publicData")) {
            requestedScopes.unshift("publicData");
        }
    } else {
        requestedScopes = defaultScopes;
    }

    const scope = requestedScopes.join(" ");
    const authorizeUrl = "https://login.eveonline.com/v2/oauth/authorize";

    // Create state with redirect information
    const stateData = {
        id: uuidv4(),
        redirectUrl: redirect,
        scopes: requestedScopes,
        killmailDelay: delay ? parseInt(delay as string, 10) : 0,
    };

    // Convert to base64 for passing in URL
    const stateBase64 = Buffer.from(JSON.stringify(stateData)).toString(
        "base64"
    );

    // Store in Redis for verification (optional security step)
    const redis = new RedisStorage();
    await redis.set(`sso:${stateData.id}`, stateBase64, 60 * 5); // 5 minutes expiration

    // Remove the single quotes around the state parameter
    const url = `${authorizeUrl}?response_type=code&client_id=${encodeURIComponent(
        clientId
    )}&redirect_uri=${encodeURIComponent(
        callbackUrl
    )}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(
        stateBase64
    )}`;

    return { url };
});
