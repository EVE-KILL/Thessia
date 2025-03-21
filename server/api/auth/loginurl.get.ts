import { defineEventHandler } from "h3";
import { v4 as uuidv4 } from "uuid";
import { RedisStorage } from "~/server/helpers/Storage";

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const { redirect } = query;

    // Use direct environment variables instead of runtime config
    const clientId = process.env.NODE_ENV === 'production'
        ? process.env.EVE_CLIENT_ID
        : process.env.EVE_CLIENT_ID_DEV;

    const callbackUrl = process.env.NODE_ENV === 'production'
        ? process.env.EVE_CLIENT_REDIRECT
        : process.env.EVE_CLIENT_REDIRECT_DEV;

    // Define scopes directly
    const scopes = ["publicData", "esi-killmails.read_killmails.v1", "esi-killmails.read_corporation_killmails.v1"];
    const scope = scopes.join(" ");
    const authorizeUrl = 'https://login.eveonline.com/v2/oauth/authorize';

    // Create state with redirect information
    const stateData = {
        id: uuidv4(),
        redirectUrl: redirect
    };

    // Convert to base64 for passing in URL
    const stateBase64 = Buffer.from(JSON.stringify(stateData)).toString('base64');

    // Store in Redis for verification (optional security step)
    const redis = new RedisStorage();
    await redis.set(`sso:${stateData.id}`, stateBase64, 60 * 5); // 5 minutes expiration

    // Remove the single quotes around the state parameter
    const url = `${authorizeUrl}?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(stateBase64)}`;

    return { url };
});
