import jwt from 'jsonwebtoken';
import { H3Event } from 'h3';
import { Users } from '../models/Users';
import { EVE_SSO_CONFIG } from './auth.config';
import type { IEveSSOTokenResponse, IEveSSOVerifyResponse } from '../interfaces/IEveSSO';

/**
 * Generate the EVE SSO authorization URL with the appropriate params
 * @param state Random state to prevent CSRF
 * @returns URL to redirect the user to login with EVE SSO
 */
export function generateAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    redirect_uri: EVE_SSO_CONFIG.CALLBACK_URL,
    client_id: EVE_SSO_CONFIG.CLIENT_ID,
    state,
    scope: EVE_SSO_CONFIG.SCOPES.join(' ')
  });

  return `${EVE_SSO_CONFIG.AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access tokens
 * @param code Authorization code from EVE SSO
 * @returns Access token response
 */
export async function getAccessToken(code: string): Promise<IEveSSOTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: EVE_SSO_CONFIG.CLIENT_ID,
    client_secret: EVE_SSO_CONFIG.SECRET_KEY,
  });

  try {
    const response = await fetch(EVE_SSO_CONFIG.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        statusMessage: `Failed to exchange code: ${await response.text()}`
      });
    }

    return await response.json();
  } catch (error) {
    console.debug('Error getting access token:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to exchange authorization code for access token'
    });
  }
}

/**
 * Use refresh token to get a new access token
 * @param refreshToken The refresh token from previous authentication
 * @returns New access token response
 */
export async function refreshAccessToken(refreshToken: string): Promise<IEveSSOTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: EVE_SSO_CONFIG.CLIENT_ID,
    client_secret: EVE_SSO_CONFIG.SECRET_KEY,
  });

  try {
    const response = await fetch(EVE_SSO_CONFIG.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        statusMessage: `Failed to refresh token: ${await response.text()}`
      });
    }

    return await response.json();
  } catch (error) {
    console.debug('Error refreshing token:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to refresh access token'
    });
  }
}

/**
 * Verify access token with EVE SSO
 * @param accessToken The access token to verify
 * @returns Character information from verification response
 */
export async function verifyToken(accessToken: string): Promise<IEveSSOVerifyResponse> {
  try {
    const response = await fetch(EVE_SSO_CONFIG.VERIFY_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        statusMessage: `Failed to verify token: ${await response.text()}`
      });
    }

    return await response.json();
  } catch (error) {
    console.debug('Error verifying token:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to verify access token'
    });
  }
}

/**
 * Generate JWT token for authenticated user
 * @param characterId Character ID from EVE
 * @returns Signed JWT token
 */
export function generateJwtToken(characterId: number): string {
  return jwt.sign(
    {
      characterId,
      type: 'auth'
    },
    EVE_SSO_CONFIG.JWT_SECRET,
    { expiresIn: EVE_SSO_CONFIG.JWT_EXPIRES_IN }
  );
}

/**
 * Get JWT from request cookies or authorization header
 * @param event H3 event
 * @returns JWT token if available
 */
export function getJwtFromEvent(event: H3Event): string | null {
  // Try cookies first
  const cookie = getCookie(event, EVE_SSO_CONFIG.COOKIE_NAME);
  if (cookie) return cookie;

  // Then check authorization header
  const authHeader = getHeader(event, 'authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Verify JWT token
 * @param token JWT token
 * @returns Decoded token payload
 */
export function verifyJwtToken(token: string): { characterId: number } {
  try {
    const decoded = jwt.verify(token, EVE_SSO_CONFIG.JWT_SECRET);
    return decoded as { characterId: number };
  } catch (error) {
    console.debug('JWT verification error:', error);
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid or expired authentication token'
    });
  }
}

/**
 * Verify if the current user is an administrator
 * @param event - H3 event object
 * @returns The user object if admin, throws error otherwise
 */
export const verifyAdmin = async (event: H3Event) => {
  const token = getJwtFromEvent(event);

  if (!token) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required'
    });
  }

  // Verify JWT
  const { characterId } = verifyJwtToken(token);

  // Check if user exists and is an admin
  const user = await Users.findOne({ characterId });
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'User not found'
    });
  }

  if (!user.administrator) {
    throw createError({
      statusCode: 403,
      message: 'Admin privileges required'
    });
  }

  return user;
};
