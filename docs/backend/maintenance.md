# Maintenance System

The Thessia maintenance system provides a robust, performance-efficient way to put the site into maintenance mode without requiring code deployments or server restarts. The system uses MongoDB-based configuration with intelligent caching to minimize database overhead.

## Overview

The maintenance system consists of several interconnected components that work together to provide seamless maintenance mode functionality:

- **Configuration Storage**: MongoDB-based config collection
- **Smart Caching**: In-memory state management with periodic updates
- **Request Interception**: Global middleware for route protection
- **User Experience**: Dedicated maintenance page with custom messaging
- **API Integration**: Status endpoint for real-time information

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Config Collection │    │  Nitro Plugin   │    │ In-Memory Cache │
│ maintenance_mode   │◀───│  (Every 60s)    │───▶│   { mode, msg } │
│ maintenance_msg    │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        ▲
                                ▼                        │
                       ┌─────────────────┐              │
                       │ Vue Middleware  │──────────────┘
                       │  (Every Req)    │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Maintenance     │
                       │     Page        │
                       └─────────────────┘
```

## Components

### 1. Nitro Plugin (`server/plugins/maintenance.ts`)

The core component that manages maintenance state and database communication.

**Key Features:**
- Polls MongoDB every 60 seconds for configuration changes
- Maintains in-memory cache of maintenance state
- Provides `getMaintenanceState()` function for other components
- Handles errors gracefully without blocking normal operations

**Configuration Keys:**
- `maintenance_mode`: Boolean string ("true"/"false") to enable/disable maintenance
- `maintenance_message`: Custom message displayed on maintenance page

### 2. Global Middleware (`src/core/middleware/maintenance.global.ts`)

Intercepts all page requests to enforce maintenance mode.

**Behavior:**
- Runs on every route navigation
- Redirects to `/maintenance` page when maintenance is enabled
- Skips enforcement for maintenance page itself and API routes
- Uses API call to check maintenance status (cached on server)

### 3. Maintenance Page (`app/pages/maintenance.vue`)

User-facing maintenance page with professional design.

**Features:**
- Displays maintenance status and custom message
- Refresh button to check if maintenance is complete
- Links to Discord for real-time updates
- Responsive design matching site theme
- Multi-language support via i18n

### 4. Status API (`server/api/maintenance/status.get.ts`)

Provides maintenance state information to frontend components.

**Response Format:**
```json
{
  "isEnabled": boolean,
  "message": string,
  "lastChecked": "2025-07-28T10:30:00.000Z"
}
```

## Configuration

### MongoDB Schema

The maintenance system uses the existing `config` collection with the following document structure:

```javascript
// Maintenance mode toggle
{
  "_id": ObjectId("..."),
  "key": "maintenance_mode",
  "value": "false", // "true" to enable, "false" to disable
  "createdAt": ISODate("..."),
  "updatedAt": ISODate("...")
}

// Custom maintenance message
{
  "_id": ObjectId("..."),
  "key": "maintenance_message",
  "value": "We are performing scheduled maintenance...",
  "createdAt": ISODate("..."),
  "updatedAt": ISODate("...")
}
```

### Database Operations

#### Initial Setup
```javascript
// Insert configuration documents
db.config.insertOne({
  key: "maintenance_mode",
  value: "false"
});

db.config.insertOne({
  key: "maintenance_message",
  value: "We are performing scheduled maintenance. Please check back soon."
});
```

#### Enable Maintenance Mode
```javascript
db.config.updateOne(
  { key: "maintenance_mode" },
  { $set: { value: "true" } },
  { upsert: true }
);
```

#### Disable Maintenance Mode
```javascript
db.config.updateOne(
  { key: "maintenance_mode" },
  { $set: { value: "false" } },
  { upsert: true }
);
```

#### Update Maintenance Message
```javascript
db.config.updateOne(
  { key: "maintenance_message" },
  { $set: { value: "Custom maintenance message here" } },
  { upsert: true }
);
```

## Performance Characteristics

### Database Impact
- **Normal Operation**: 0 queries per request (uses cache)
- **Background Updates**: 2 queries every 60 seconds globally
- **Cache Miss Handling**: Graceful degradation without blocking requests

### Memory Usage
- **State Storage**: ~100 bytes for maintenance state object
- **Caching Overhead**: Negligible impact on total memory usage

### Response Time Impact
- **Middleware Overhead**: < 1ms per request
- **Database Check**: Asynchronous, non-blocking
- **User Experience**: No perceptible delay during normal operation

## Operational Procedures

### Enabling Maintenance Mode

1. **Update Database Configuration:**
   ```javascript
   db.config.updateOne(
     { key: "maintenance_mode" },
     { $set: { value: "true" } }
   );
   ```

2. **Set Custom Message (Optional):**
   ```javascript
   db.config.updateOne(
     { key: "maintenance_message" },
     { $set: { value: "Scheduled maintenance in progress. Expected completion: 2 hours." } }
   );
   ```

3. **Verification:**
   - Wait up to 60 seconds for changes to propagate
   - Visit any site page to confirm redirect to maintenance page
   - Check server logs for confirmation: `[Maintenance] Status updated: ENABLED`

### Disabling Maintenance Mode

1. **Update Database Configuration:**
   ```javascript
   db.config.updateOne(
     { key: "maintenance_mode" },
     { $set: { value: "false" } }
   );
   ```

2. **Verification:**
   - Wait up to 60 seconds for changes to propagate
   - Refresh maintenance page or navigate to home page
   - Check server logs for confirmation: `[Maintenance] Status updated: DISABLED`

### Emergency Procedures

If the maintenance system malfunctions:

1. **Bypass via Code**: Comment out middleware temporarily
2. **Database Reset**: Ensure config documents exist with correct schema
3. **Server Restart**: Force immediate config reload
4. **Monitoring**: Check server logs for error messages

## Security Considerations

### Access Control
- Database configuration changes require MongoDB access
- No authentication bypass mechanisms built into maintenance mode
- API routes continue to function during maintenance (configurable)

### Route Protection
- All frontend routes are protected by default
- API routes can be optionally protected by modifying middleware
- Maintenance page itself is always accessible

## Customization Options

### Adjust Check Interval
Modify the polling frequency in `server/plugins/maintenance.ts`:

```typescript
// Check every 30 seconds instead of 60
const CHECK_INTERVAL = 30 * 1000;
```

### Skip Routes During Maintenance
Add route exceptions in the middleware:

```typescript
// Allow admin access during maintenance
if (to.path.startsWith("/admin/")) {
  return;
}

// Allow specific API endpoints
if (to.path.startsWith("/api/health/")) {
  return;
}
```

### Custom Maintenance Page
The maintenance page template is fully customizable in `app/pages/maintenance.vue`.

### Internationalization
Add maintenance translations to locale files in `i18n/locales/`:

```json
{
  "maintenance.title": "Maintenance Mode",
  "maintenance.description": "Site is under maintenance...",
  // ... other keys
}
```

## Monitoring and Logging

### Server Logs
The maintenance system provides structured logging:

```
[Maintenance] Plugin initialized
[Maintenance] Status updated: ENABLED
[Maintenance] Status updated: DISABLED
[Maintenance] Error fetching config: <error details>
```

### Health Checks
Monitor maintenance system health via:
- Database connection status
- Config document existence
- API endpoint response (`/api/maintenance/status`)

## Troubleshooting

### Common Issues

**Maintenance mode not activating:**
- Verify config documents exist in MongoDB
- Check `value` field is string "true", not boolean
- Wait up to 60 seconds for cache refresh
- Check server logs for error messages

**Infinite redirect loops:**
- Ensure maintenance page route (`/maintenance`) is excluded in middleware
- Verify middleware logic for route skipping

**Database connection errors:**
- Check MongoDB connectivity
- Verify Config model schema matches documents
- Review server logs for database errors

**Performance degradation:**
- Monitor database query frequency (should be 2 queries per 60 seconds)
- Check for excessive API calls to maintenance status endpoint
- Review middleware execution time in request logs

### Debug Mode
Enable debug logging by adding console.log statements in the maintenance plugin:

```typescript
async function fetchMaintenanceConfig(): Promise<void> {
  try {
    console.log("[Maintenance] Fetching config from database...");
    const [modeConfig, messageConfig] = await Promise.all([...]);
    console.log("[Maintenance] Mode config:", modeConfig);
    console.log("[Maintenance] Message config:", messageConfig);
    // ... rest of function
  } catch (error) {
    console.error("[Maintenance] Database error:", error);
  }
}
```

## Future Enhancements

Potential improvements to the maintenance system:

- **Real-time Updates**: WebSocket-based immediate propagation
- **Scheduled Maintenance**: Automatic activation/deactivation based on time
- **Granular Control**: Per-route or per-user maintenance exceptions
- **Maintenance Dashboard**: Admin interface for maintenance management
- **Notification Integration**: Discord/Slack notifications for maintenance events
- **Health Monitoring**: Integration with application monitoring systems
