import { defineEventHandler } from "h3";
import { v4 as uuidv4 } from "uuid";
import { RedisStorage } from "~/server/helpers/Storage";

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const { redirect } = query;
    const config = useRuntimeConfig().eve;
    const clientId = config.clientId;
    const callbackUrl = config.callbackUrl;
    const scope = config.scopes.join(" ");
    const authorizeUrl = config.authorizeUrl;

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
