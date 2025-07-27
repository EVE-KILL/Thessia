# Export API

The Export API provides endpoints for bulk data export from Thessia's MongoDB collections with pagination support. It offers a secure and efficient way to access large datasets without overwhelming the database or the client.

## Overview

The Export API consists of two main endpoints:

1. **Collection Discovery** (`GET /api/export`) - Lists available collections with metadata
2. **Data Export** (`GET /api/export/[collection]`) - Exports data from a specific collection

## Security & Access Control

The API implements a whitelist-based security model where only specifically approved collections can be exported. The following collections are **excluded** for security and operational reasons:

- `Config` - System configuration data
- `DScan` - Temporary scan data
- `LocalScan` - Temporary scan data
- `SavedQuery` - User-specific query data
- `Users` - User account information

## Available Collections

The following collections are available for export:

- `alliances` - EVE Alliance data
- `battles` - Battle/fight data
- `bloodlines` - EVE character bloodlines
- `campaigns` - Campaign data
- `celestials` - Celestial objects data
- `characterachievements` - Character achievement data
- `characters` - EVE character data
- `comments` - User comments
- `constellations` - EVE constellation data
- `corporations` - EVE corporation data
- `customprices` - Custom price data
- `factions` - EVE faction data
- `historicalstats` - Historical statistics
- `invflags` - Inventory flags
- `invgroups` - Inventory groups
- `invtypes` - Inventory types
- `killmails` - Killmail data
- `killmailsesi` - ESI killmail data
- `prices` - Market price data
- `races` - EVE races data
- `regions` - EVE region data
- `solarsystems` - Solar system data
- `stats` - Statistics data
- `wars` - War data

## Endpoints

### 1. Collection Discovery

**Endpoint:** `GET /api/export`

**Description:** Returns a list of all available collections with their estimated document counts.

**Response Format:**

```json
[
  {
    "collection": "alliances",
    "estimatedCount": 15420,
    "rateLimits": {
      "10000": {
        "requestsPerSecond": 1,
        "maxBurstRequests": 2
      },
      "1000": {
        "requestsPerSecond": 5,
        "maxBurstRequests": 10
      },
      "100": {
        "requestsPerSecond": 10,
        "maxBurstRequests": 20
      },
      "10": {
        "requestsPerSecond": 100,
        "maxBurstRequests": 200
      }
    }
  }
]
```

**Response Fields:**

- `collection` (string) - The collection name
- `estimatedCount` (number) - Estimated number of documents in the collection
- `rateLimits` (object) - Rate limiting information for different request sizes**Example Request:**

```bash
curl "https://eve-kill.com/api/export"
```

### 2. Data Export

**Endpoint:** `GET /api/export/[collection]`

**Description:** Exports data from the specified collection with pagination support using cursor-based pagination via MongoDB's `_id` field.

**URL Parameters:**

- `collection` (required) - The name of the collection to export (must be from the allowed list)

**Query Parameters:**

- `limit` (optional) - Number of documents to return
  - Minimum: 1
  - Maximum: 10,000
  - Default: 1,000
- `after` (optional) - MongoDB ObjectId to start pagination after
- `before` (optional) - MongoDB ObjectId to end pagination before

**Pagination Logic:**

- **No parameters**: Returns the most recent documents (descending by `_id`)
- **`after` parameter**: Returns documents from the specified ID onwards (inclusive)
- **`before` parameter**: Returns documents up to the specified ID (inclusive)
- **Cannot use both `after` and `before` simultaneously**

**Response Format:**

```json
{
  "collection": "alliances",
  "limit": 10,
  "after": "507f1f77bcf86cd799439011",
  "before": null,
  "count": 10,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "alliance_id": 12345,
      "name": "Example Alliance",
      "ticker": "EXAM"
    }
  ]
}
```

**Response Fields:**

- `collection` (string) - The collection name
- `limit` (number) - The limit that was applied
- `after` (string|null) - The after parameter used
- `before` (string|null) - The before parameter used
- `count` (number) - Actual number of documents returned
- `data` (array) - Array of documents from the collection

## Usage Examples

### Basic Export

Get the first 100 alliances:

```bash
curl "https://eve-kill.com/api/export/alliances?limit=100"
```

### Pagination with "after"

Continue from a specific point:

```bash
curl "https://eve-kill.com/api/export/alliances?limit=100&after=507f1f77bcf86cd799439011"
```

### Pagination with "before"

Get documents before a specific point:

```bash
curl "https://eve-kill.com/api/export/alliances?limit=100&before=507f1f77bcf86cd799439012"
```

### Discover Available Collections

```bash
curl "https://eve-kill.com/api/export"
```

## Error Handling

The API returns standard HTTP status codes and JSON error responses:

### 400 Bad Request

- Invalid collection name
- Invalid limit parameter
- Invalid ObjectId format for after/before
- Using both after and before parameters

```json
{
  "statusCode": 400,
  "statusMessage": "Collection 'invalid' is not available for export. Available collections: alliances, battles, ..."
}
```

### 500 Internal Server Error

- Database connection issues
- Unexpected server errors

```json
{
  "statusCode": 500,
  "statusMessage": "Internal server error while exporting data"
}
```

## Performance Considerations

1. **Lean Queries**: The API uses MongoDB's `lean()` option for optimal performance
2. **Indexed Pagination**: Pagination uses the indexed `_id` field for efficient queries
3. **Limit Constraints**: Maximum limit of 10,000 documents prevents excessive resource usage
4. **No Caching**: Data is read directly from the database to ensure freshness
5. **Estimated Counts**: Collection counts use `estimatedDocumentCount()` for speed

## Rate Limiting

The API implements progressive rate limiting based on the requested limit parameter to encourage efficient usage:

### Rate Limit Tiers

| Request Limit | Max Requests/Second | Max Burst Requests | Efficiency Score |
|---------------|--------------------|--------------------|------------------|
| 10,000        | 1                  | 2                  | 10,000/sec       |
| 1,000+        | 5                  | 10                 | 5,000/sec        |
| 100+          | 10                 | 20                 | 1,000/sec        |
| < 100         | 100                | 200                | < 1,000/sec      |

### IP Whitelisting

IPs listed in the `export_ip_whitelist` configuration are exempt from all rate limiting.

### Rate Limit Headers

All responses include rate limiting information in headers:

```http
X-RateLimit-Limit: 5                    # Requests per second allowed
X-RateLimit-Remaining: 3                # Remaining requests in current window
X-RateLimit-Reset: 1640995200           # Unix timestamp when limit resets
X-RateLimit-Window: 1000                # Window size in milliseconds
X-RateLimit-Whitelisted: false          # Whether IP is whitelisted
X-Export-Rate-For-Limit: 5/sec          # Rate limit for current request size
X-Export-Efficiency-Score: 500          # Theoretical max items/sec at this rate
```

### Export-Specific Headers

Additional headers provide export context:

```http
X-Export-Collection: alliances          # Collection being exported
X-Export-Total-Count: 15420             # Total items in collection
X-Export-Returned-Count: 100            # Items returned in this response
X-Export-Limit-Used: 100                # Limit parameter used
X-Export-Max-Limit: 10000               # Maximum allowed limit
```

### 429 Rate Limit Exceeded

When rate limited, the API returns HTTP 429 with retry information:

```json
{
  "statusCode": 429,
  "statusMessage": "Rate limit exceeded. Maximum 5 requests per second for limit 1000. Try again in 1 seconds."
}
```

Headers include:

```http
Retry-After: 1                          # Seconds to wait before retry
```

## Data Consistency

- Data is read directly from the primary MongoDB instance
- No special consistency guarantees beyond MongoDB's default read preferences
- Documents may be inserted/updated between paginated requests

## Implementation Details

### Cursor-Based Pagination

The API implements cursor-based pagination using MongoDB's `_id` field:

1. **Ascending Order**: Documents are always sorted in descending order by `_id` (newest first)
2. **Boundary Handling**: The boundary document is included in results when using `after`/`before`
3. **Filter Logic**:
   - `after`: Uses `$lt` to include documents from the specified ID onwards
   - `before`: Uses `$gt` to include documents up to the specified ID

### Rate Limiting Implementation

The API uses an in-memory sliding window rate limiter with the following features:

1. **Progressive Limits**: Rate limits scale with request size to encourage efficient usage
2. **IP-based Tracking**: Each client IP has its own rate limit tracking
3. **Whitelist Support**: IPs in `export_ip_whitelist` config bypass all limits
4. **Sliding Window**: Uses a 1-second sliding window for accurate rate limiting
5. **Burst Allowance**: Allows brief bursts above the per-second rate
6. **Automatic Cleanup**: Periodically cleans up old tracking data

### Security Model

- **Whitelist-based**: Only explicitly allowed collections can be accessed
- **No Authentication**: Currently public API (consider adding authentication for production)
- **Input Validation**: All parameters are validated before database queries
- **ObjectId Validation**: MongoDB ObjectId format is strictly validated

## Data Import Console Command

For self-hosted instances, Thessia includes a console command to import data from a remote Thessia instance using the Export API.

### Usage

```bash
# Set the source URL in config first
bun console.ts config:set import_source_url "https://eve-kill.com"

# Optionally specify which collections to import (comma-separated)
bun console.ts config:set import_collections "alliances,corporations,characters"

# Run the import
bun console.ts import:data
```

### Configuration Options

- `import_source_url` (required) - Base URL of the source Thessia instance
- `import_collections` (optional) - Comma-separated list of collections to import. If not set, all available collections will be imported

### Features

- **Resume Support**: Import can be stopped and resumed. Progress is saved in config
- **Rate Limit Handling**: Automatically handles rate limits with appropriate delays
- **Bulk Operations**: Uses MongoDB bulk operations for efficient importing
- **Error Recovery**: Gracefully handles partial failures and connection issues
- **Progress Tracking**: Detailed logging of import progress per collection

### Import Process

1. **Discovery**: Fetches available collections from `/api/export`
2. **Validation**: Validates that local models exist for each collection
3. **Pagination**: Uses cursor-based pagination to fetch data in batches
4. **Upsert**: Uses upsert operations to avoid duplicates based on `_id`
5. **Progress**: Saves progress after each batch for resumability

### Import Performance Notes

- Imports 1000 documents per API request
- Processes 500 documents per bulk write operation
- Includes 200ms delays between API requests to be respectful
- Automatically handles rate limiting with exponential backoff

## Future Enhancements

Potential improvements to consider:

1. **Authentication**: Add API key or OAuth-based authentication
2. **Rate Limiting**: Implement per-client rate limiting
3. **Field Selection**: Allow clients to specify which fields to return
4. **Filtering**: Add basic filtering capabilities beyond pagination
5. **Compression**: Add gzip compression for large responses
6. **Streaming**: Support streaming responses for very large datasets
