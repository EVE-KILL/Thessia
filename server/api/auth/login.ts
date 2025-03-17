import { v4 as uuidv4 } from 'uuid';
import { generateAuthUrl } from '~/server/utils/auth.utils';

export default defineEventHandler(async (event) => {
  try {
    // Get redirect URL from query if provided
    const query = getQuery(event);
    const redirectUrl = query.redirect || '/';

    // Generate a random state to prevent CSRF
    // Include the redirectUrl in the state to redirect after auth
    const state = btoa(JSON.stringify({
      nonce: uuidv4(),
      redirectUrl
    }));

    // Generate the authorization URL
    const authUrl = generateAuthUrl(state);

    // Return the URL to redirect to
    return {
      authUrl,
      state
    };

  } catch (error) {
    console.debug('Login error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate authentication URL'
    });
  }
});
