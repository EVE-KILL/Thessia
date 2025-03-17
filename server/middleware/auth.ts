import { getJwtFromEvent, verifyJwtToken } from "../utils/auth.utils";

// List of API endpoints that require authentication
const PROTECTED_ENDPOINTS = [
  '/api/user/profile',
  '/api/user/delete',
];

/**
 * Middleware to check authentication for protected endpoints
 */
export default defineEventHandler(async (event) => {
  const path = event.path;

  // Check if this endpoint requires authentication
  const requiresAuth = PROTECTED_ENDPOINTS.some(endpoint =>
    // Exact match or path starts with protected endpoint
    path === endpoint || path.startsWith(`${endpoint}/`)
  );

  // Skip auth check for endpoints not requiring authentication
  if (!requiresAuth) {
    return;
  }

  try {
    // Get JWT from request
    const token = getJwtFromEvent(event);

    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: "Authentication required for this endpoint",
      });
    }

    // Verify JWT
    const { characterId } = verifyJwtToken(token);

    // Set characterId in event context for later use
    event.context.characterId = characterId;
  } catch (error) {
    if (error.statusCode === 401) {
      throw error;
    }

    throw createError({
      statusCode: 401,
      statusMessage: "Invalid authentication",
    });
  }
});
