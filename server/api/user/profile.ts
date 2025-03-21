import { getCookie } from 'h3';

export default defineEventHandler(async (event) => {
  try {
    // Use hardcoded cookie name
    const cookieName = 'evelogin';
    const cookie = getCookie(event, cookieName);

    if (!cookie) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      });
    }

    // Forward the request to the me endpoint for consistency
    const { data } = await useFetch('/api/auth/me', {
      headers: {
        Cookie: `${cookieName}=${cookie}`
      }
    });

    if (!data.value || !data.value.authenticated) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      });
    }

    // Return just the user data portion
    return data.value.user;
  } catch (error) {
    console.debug('Get profile error:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to get user profile'
    });
  }
});
