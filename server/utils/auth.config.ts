/**
 * EVE Online SSO configuration
 */
export const EVE_SSO_CONFIG = {
  CLIENT_ID: process.env.NODE_ENV === 'production' ? process.env.EVE_CLIENT_ID : process.env.EVE_CLIENT_ID_DEV || '',
  SECRET_KEY: process.env.NODE_ENV === 'production' ? process.env.EVE_CLIENT_SECRET : process.env.EVE_CLIENT_SECRET_DEV || '',
  CALLBACK_URL: process.env.NODE_ENV === 'production' ? process.env.EVE_CLIENT_REDIRECT : process.env.EVE_CLIENT_REDIRECT_DEV || 'http://localhost:3000/auth/callback',
  TOKEN_URL: 'https://login.eveonline.com/v2/oauth/token',
  AUTHORIZE_URL: 'https://login.eveonline.com/v2/oauth/authorize',
  VERIFY_URL: 'https://login.eveonline.com/oauth/verify',
  SCOPES: [
    'publicData',
    'esi-killmails.read_killmails.v1',
    'esi-killmails.read_corporation_killmails.v1'
  ],
  JWT_SECRET: process.env.JWT_SECRET || 'change-me-in-production',
  JWT_EXPIRES_IN: '7d',
  COOKIE_NAME: 'thessia_token'
};
