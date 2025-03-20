
export function getAccessToken(code: string): Promise<IAuthAccessToken> {
    const config = useRuntimeConfig().eve;
    const tokenUrl = config.tokenUrl;
    const clientId = config.clientId;
    const clientSecret = config.clientSecret;

    const payload = {
        grant_type: 'authorization_code',
        code: code
    };

    return $fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'EVE-KILL',
            'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
        },
        body: new URLSearchParams(payload).toString()
    });
}

export function verifyToken(accessToken: string): Promise<FetchEvent> {
    const config = useRuntimeConfig().eve;
    const verifyUrl = config.verifyUrl;

    return $fetch(verifyUrl, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
}

export function decodeState(state: string) {
    const decoded = Buffer.from(state, 'base64').toString('utf-8');
    return JSON.parse(decoded);
}

interface IAuthUserData {
    characterId: number;
    characterName: string;
    characterOwnerHash: string;
    scopes: string[];
    corporationId: number;
    corporationName: string;
    allianceId: number;
    allianceName: string;
}
export async function getUserData(accessToken: string): Promise<IAuthUserData> {
    const verifyResponse = await verifyToken(accessToken);

    if (verifyResponse.CharacterID) {
        const userData = {
            characterId: verifyResponse.CharacterID,
            characterName: verifyResponse.CharacterName,
            characterOwnerHash: verifyResponse.CharacterOwnerHash,
            scopes: verifyResponse.Scopes
        };

        return userData;
    }

    throw new Error('Invalid token');
}
