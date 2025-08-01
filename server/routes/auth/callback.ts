import { v4 as uuidv4 } from "uuid";

export default defineEventHandler(async (event) => {
    const cookieName = "evelogin";
    const query = getQuery(event);
    const { code, state } = query;

    // Decode the state
    const decodedState = decodeState(state as string);

    // Check if the state is valid
    const redis = new RedisStorage();
    const foundState = await redis.get(`sso:${decodedState.id}`);
    if (!foundState) {
        console.debug(`[Auth] State not found in Redis: ${decodedState.id}`);
        return {
            error: "Invalid state",
            message: "The state parameter is invalid or has expired.",
        };
    }
    // Remove the state from Redis
    await redis.del(`sso:${decodedState.id}`);

    // Lets gets the accessToken
    const accessTokenRequest: IAuthAccessToken = await getAccessToken(
        code as string
    );
    const accessToken = accessTokenRequest.access_token;
    const expiresIn = accessTokenRequest.expires_in;
    const tokenType = accessTokenRequest.token_type;
    const refreshToken = accessTokenRequest.refresh_token;

    // Generate user data
    const userData = await getUserData(accessToken);

    // Generate a unique identifier
    const uniqueIdentifier = uuidv4();

    // Generate the payload we need to save in the database
    const payload: any = {
        accessToken: accessToken,
        dateExpiration: new Date(Date.now() + expiresIn * 1000),
        refreshToken: refreshToken,
        characterId: userData.characterId,
        characterName: userData.characterName,
        scopes: userData.scopes,
        tokenType: tokenType,
        characterOwnerHash: userData.characterOwnerHash,
        uniqueIdentifier: uniqueIdentifier,
        lastChecked: new Date(),
        canFetchCorporationKillmails: userData.scopes.includes(
            "esi-killmails.read_corporation_killmails.v1"
        ),
        settings: [],
    };

    // Add killmail delay setting if provided
    if (decodedState.killmailDelay && decodedState.killmailDelay > 0) {
        payload.settings.push({
            key: "killmailDelay",
            value: decodedState.killmailDelay,
            updatedAt: new Date(),
        });
    }

    const user = new Users(payload);
    try {
        await user.save();
    } catch (error) {
        await Users.updateOne({ characterId: user.characterId }, payload, {
            upsert: true,
        });
    }

    // Set the cookie using h3's setCookie instead of Vue's useCookie
    setCookie(event, cookieName, uniqueIdentifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
    });

    // If all went well, redirect the user to the original URL
    return sendRedirect(event, decodedState.redirectUrl);
});
