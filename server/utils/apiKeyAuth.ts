/**
 * Validates an API key and returns the associated key data if valid
 * @param apiKey - The API key to validate
 * @returns Promise<{valid: boolean, keyData?: any}> - Validation result
 */
export async function validateApiKey(apiKey: string): Promise<{
    valid: boolean;
    keyData?: any;
    error?: string;
}> {
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
        return {
            valid: false,
            error: "API key is required",
        };
    }

    try {
        // Find the API key in the database
        const keyData = await ApiKeys.findOne({
            key: apiKey.trim(),
            active: true,
        }).lean();

        if (!keyData) {
            return {
                valid: false,
                error: "Invalid or inactive API key",
            };
        }

        // Update last used timestamp
        await ApiKeys.updateOne({ _id: keyData._id }, { lastUsed: new Date() });

        return {
            valid: true,
            keyData: {
                id: keyData._id,
                name: keyData.name,
                description: keyData.description,
                createdBy: keyData.createdBy,
                createdAt: keyData.createdAt,
            },
        };
    } catch (error) {
        return {
            valid: false,
            error: "Database error validating API key",
        };
    }
}

/**
 * Middleware for protecting API endpoints with API key authentication
 * @param event - H3 event object
 * @returns Promise<{valid: boolean, keyData?: any}> - Validation result
 */
export async function requireApiKey(event: any): Promise<{
    valid: boolean;
    keyData?: any;
    error?: string;
}> {
    // Check for API key in headers
    const apiKeyHeader =
        getHeader(event, "x-api-key") || getHeader(event, "authorization");

    let apiKey: string | undefined;

    if (apiKeyHeader) {
        // Handle both "Bearer <key>" and direct key formats
        if (apiKeyHeader.startsWith("Bearer ")) {
            apiKey = apiKeyHeader.substring(7);
        } else {
            apiKey = apiKeyHeader;
        }
    }

    // Also check query parameter as fallback
    if (!apiKey) {
        const query = getQuery(event);
        apiKey = (query.api_key as string) || (query.apikey as string);
    }

    if (!apiKey) {
        return {
            valid: false,
            error: "API key required. Provide via 'X-API-Key' header, 'Authorization: Bearer <key>' header, or 'api_key' query parameter",
        };
    }

    return await validateApiKey(apiKey);
}

/**
 * Creates an error response for API key validation failures
 * @param error - Error message
 * @param statusCode - HTTP status code (defaults to 401)
 */
export function createApiKeyError(error: string, statusCode: number = 401) {
    throw createError({
        statusCode,
        statusMessage: error,
        data: {
            error: "Authentication failed",
            message: error,
            timestamp: new Date().toISOString(),
        },
    });
}

/**
 * Default export containing all API key authentication utilities
 */
export default {
    validateApiKey,
    requireApiKey,
    createApiKeyError,
};
