import { EVE_SSO_CONFIG } from '~/server/utils/auth.config';

export default defineEventHandler(async (event) => {
  try {
    // Clear the auth cookie
    deleteCookie(event, EVE_SSO_CONFIG.COOKIE_NAME, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return {
      success: true,
      message: 'Logged out successfully'
    };

  } catch (error) {
    console.debug('Logout error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to log out'
    });
  }
});
