import { getJwtFromEvent, verifyJwtToken } from '~/server/utils/auth.utils';
import { Users } from '~/server/models/Users';
import { EVE_SSO_CONFIG } from '~/server/utils/auth.config';

export default defineEventHandler(async (event) => {
  try {
    // Only allow POST method
    if (event.method !== 'POST') {
      return createError({
        statusCode: 405,
        statusMessage: 'Method not allowed'
      });
    }

    // Get JWT token
    const token = getJwtFromEvent(event);

    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      });
    }

    // Verify JWT
    const { characterId } = verifyJwtToken(token);

    // Delete user from database
    const deleteResult = await Users.deleteOne({ characterId });

    // Check if deletion was successful
    if (deleteResult.deletedCount === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found or already deleted'
      });
    }

    // Clear the auth cookie
    deleteCookie(event, EVE_SSO_CONFIG.COOKIE_NAME, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    // Return success
    return {
      success: true,
      message: 'User data deleted successfully'
    };

  } catch (error) {
    console.debug('Delete user error:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to delete user data'
    });
  }
});
