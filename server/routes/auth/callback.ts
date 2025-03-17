import { v4 as uuidv4 } from 'uuid';
import { Users } from '~/server/models/Users';
import { getAccessToken, verifyToken, generateJwtToken } from '~/server/utils/auth.utils';
import { EVE_SSO_CONFIG } from '~/server/utils/auth.config';

export default defineEventHandler(async (event) => {
  const startTime = new Date();

  try {
    // Get the authorization code and state from query params
    const query = getQuery(event);
    const { code, state } = query;

    if (!code) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Authorization code missing'
      });
    }

    console.debug(`[Auth] Processing callback for code: ${code.toString().substring(0, 6)}...`);

    // Get access token from EVE SSO
    const tokenResponse = await getAccessToken(code.toString());
    console.debug('[Auth] Successfully obtained access token');

    // Verify the token with EVE SSO
    const verifyResponse = await verifyToken(tokenResponse.access_token);
    console.debug(`[Auth] Token verified for character: ${verifyResponse.CharacterName} (${verifyResponse.CharacterID})`);

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.expires_in);

    // Generate a unique identifier for this auth
    const uniqueIdentifier = uuidv4();

    // Create user data object
    const userData = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      dateExpiration: expiresAt,
      characterId: verifyResponse.CharacterID,
      characterName: verifyResponse.CharacterName,
      scopes: verifyResponse.Scopes.split(' '),
      tokenType: verifyResponse.TokenType,
      characterOwnerHash: verifyResponse.CharacterOwnerHash,
      uniqueIdentifier,
      lastChecked: new Date(),
      canFetchCorporationKillmails: verifyResponse.Scopes.includes('esi-killmails.read_corporation_killmails.v1')
    };

    // Log the user data we're about to save (without sensitive info)
    console.debug(`[Auth] Processing user data for character: ${userData.characterName} (${userData.characterId})`);

    try {
      // First, check if the user already exists
      const existingUser = await Users.findOne({ characterId: verifyResponse.CharacterID });

      if (existingUser) {
        // User exists, update it
        console.debug(`[Auth] Character ${userData.characterId} exists, updating record`);
        await Users.updateOne({ characterId: verifyResponse.CharacterID }, userData);
      } else {
        // User doesn't exist, create a new one
        console.debug(`[Auth] Character ${userData.characterId} is new, creating record`);
        const newUser = new Users(userData);
        await newUser.save();
      }

      // Verify the user was saved by fetching it
      const savedUser = await Users.findOne({ characterId: verifyResponse.CharacterID });
      if (!savedUser) {
        throw new Error(`Failed to find user ${userData.characterId} after save operation`);
      }

      console.debug(`[Auth] Successfully saved user data for character ${userData.characterId}`);
      console.debug(`[Auth] User has ${savedUser.scopes.length} scopes granted`);
    } catch (dbError) {
      console.debug('[Auth] Database error:', dbError);
      throw createError({
        statusCode: 500,
        statusMessage: `Database error: ${dbError.message}`
      });
    }

    // Generate JWT token for authenticating API requests
    const jwtToken = generateJwtToken(verifyResponse.CharacterID);

    // Set the token in a cookie
    setCookie(event, EVE_SSO_CONFIG.COOKIE_NAME, jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    // If state contains redirectUrl (stored by frontend during login init)
    let redirectUrl = '/';
    try {
      if (state) {
        const stateObj = JSON.parse(atob(state.toString()));
        if (stateObj.redirectUrl) {
          redirectUrl = stateObj.redirectUrl;
        }
      }
    } catch (e) {
      console.debug('Error parsing state:', e);
    }

    console.debug(`[Auth] Authentication successful, redirecting to: ${redirectUrl}`);

    // Redirect back to the frontend with success
    return sendRedirect(event, redirectUrl);

  } catch (error) {
    console.debug('[Auth] Authentication error:', error);

    // Redirect with error
    return sendRedirect(event, '/?auth_error=true');
  } finally {
    console.debug(`[Auth] Callback execution time: ${new Date().getTime() - startTime.getTime()}ms`);
  }
});
