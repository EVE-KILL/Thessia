# API Key Authentication System

This document describes the API key authentication system implemented in Thessia.

## Overview

The API key system provides secure access to protected API endpoints using cryptographically secure tokens. It includes:

- **Admin UI**: Complete management interface in the admin panel
- **Database Model**: Dedicated ApiKeys collection for storing key metadata
- **Authentication Utilities**: Helper functions for validating API keys
- **Example Endpoints**: Demonstration of how to protect APIs

## Components

### 1. Database Model

**Location**: `/server/models/ApiKeys.ts`

The ApiKeys model stores:
- `name`: Human-readable identifier
- `key`: 64-character hex token (32 random bytes)
- `description`: Optional description
- `active`: Boolean status
- `lastUsed`: Timestamp of last usage
- `createdBy`: Character ID of the admin who created it
- `createdAt`/`updatedAt`: Automatic timestamps

### 2. Admin UI

**Location**: `/app/components/admin/AdminApiKeys.vue`

Features:
- List all API keys with pagination and search
- Create new API keys with one-time display
- Edit key names, descriptions, and active status
- Delete API keys with confirmation
- Filter by active status
- Real-time usage tracking

### 3. Authentication Utilities

**Location**: `/server/utils/apiKeyAuth.ts`

Provides:
- `validateApiKey(apiKey)`: Validates a key and updates usage
- `requireApiKey(event)`: Middleware for protecting endpoints
- `createApiKeyError(error)`: Standardized error responses

### 4. API Endpoints

**Admin Management** (`/server/api/admin/apikeys/`):
- `GET /` - List API keys (paginated, searchable)
- `POST /` - Create new API key
- `PATCH /[id]` - Update API key
- `DELETE /[id]` - Delete API key

**Example Protected Endpoint**:
- `GET /api/protected-example` - Demonstrates API key usage

## Usage

### For Admins

1. **Access the Admin Panel**
   - Navigate to the admin panel
   - Go to "Management" → "API Keys"

2. **Create API Keys**
   - Click "Create New Key"
   - Provide a descriptive name and optional description
   - Copy the generated key (shown only once)

3. **Manage Keys**
   - View usage statistics and creation details
   - Edit names and descriptions
   - Activate/deactivate keys
   - Delete unused keys

### For Developers

#### Protecting an Endpoint

```typescript
export default defineEventHandler(async (event) => {
    // Validate API key
    const authResult = await requireApiKey(event);

    if (!authResult.valid) {
        createApiKeyError(authResult.error || "Invalid API key");
    }

    // Your protected logic here
    return {
        success: true,
        data: "Protected data",
        apiKeyInfo: authResult.keyData
    };
});
```

#### Client Usage

API keys can be provided in three ways:

1. **X-API-Key Header** (Recommended)
```bash
curl -H "X-API-Key: your-api-key-here" https://api.example.com/protected
```

2. **Authorization Bearer Header**
```bash
curl -H "Authorization: Bearer your-api-key-here" https://api.example.com/protected
```

3. **Query Parameter** (Less secure)
```bash
curl "https://api.example.com/protected?api_key=your-api-key-here"
```

## Security Features

- **Cryptographically Secure**: Keys use `crypto.randomBytes(32)` for generation
- **One-Time Display**: Keys are shown only once during creation
- **Usage Tracking**: Automatic timestamp updates on each use
- **Active/Inactive Status**: Immediate key deactivation without deletion
- **Admin-Only Management**: Only authenticated admins can manage keys
- **Secure Storage**: Raw keys are never returned in list operations

## Database Schema

```javascript
{
    name: String,           // "Mobile App API"
    key: String,            // "a1b2c3d4e5f6..." (64 chars)
    description: String,    // "API access for mobile app"
    active: Boolean,        // true
    lastUsed: Date,         // 2025-08-02T10:30:00.000Z
    createdBy: String,      // "12345678" (character ID)
    createdAt: Date,        // Auto-generated
    updatedAt: Date         // Auto-generated
}
```

## Navigation Integration

The API Keys management is integrated into the admin navigation under:
**Management** → **API Keys**

## Internationalization

All UI text is fully internationalized with support for multiple languages. Translation keys are under `admin.apiKeys.*` in the locale files.

## Error Handling

The system provides standardized error responses:

```json
{
    "statusCode": 401,
    "statusMessage": "Invalid API key",
    "data": {
        "error": "Authentication failed",
        "message": "API key required. Provide via 'X-API-Key' header...",
        "timestamp": "2025-08-02T10:30:00.000Z"
    }
}
```

## Future Enhancements

Potential improvements for the system:

- **Rate Limiting**: Per-key rate limits
- **Scoped Permissions**: Different access levels per key
- **Expiration Dates**: Automatic key expiration
- **IP Restrictions**: Limit keys to specific IP ranges
- **Audit Logging**: Detailed access logs per key
- **Webhooks**: Notifications for key events

## Example Implementation

See `/server/api/protected-example.get.ts` for a complete example of how to implement API key protection in your endpoints.
