# Killmail Streaming API

Real-time killmail delivery through HTTP long-polling endpoints. Thessia provides two streaming endpoints for different use cases.

## Endpoints Overview

| Endpoint | Purpose | Data Format | Use Case |
|----------|---------|-------------|----------|
| `/redisq` | zKillboard compatibility | RedisQ format | Migration from zKillboard |
| `/stream` | Full killmail data | Complete killmail | New applications |

## RedisQ Endpoint

**GET** `/redisq`

zKillboard-compatible endpoint for seamless migration.

### Parameters

- `queueID` (required): Unique client identifier
- `ttw` (optional): Wait timeout in seconds (1-10, default: 10)

### Response

```json
{
  "package": {
    "killID": 123456789,
    "killmail": { /* ESI killmail format */ },
    "zkb": {
      "locationID": 40009077,
      "hash": "abc123...",
      "fittedValue": 125430000,
      "droppedValue": 45230000,
      "destroyedValue": 80200000,
      "totalValue": 125430000,
      "points": 0,
      "npc": false,
      "solo": false,
      "awox": false,
      "href": "https://esi.evetech.net/v1/killmails/...",
      "createdAt": "2024-01-15T14:30:15.123Z",
      "labels": []
    }
  }
}
```

### Migration Example

```javascript
// Old zKillboard URL
const oldUrl = 'https://zkillredisq.stream/listen.php?queueID=myapp';

// New Thessia URL
const newUrl = 'https://eve-kill.com/redisq?queueID=myapp';
```

## Stream Endpoint

**GET** `/stream`

Complete killmail data including items and all metadata.

### Parameters

- `queueID` (required): Unique client identifier
- `ttw` (optional): Wait timeout in seconds (1-10, default: 10)

### Response

```json
{
  "killmail": {
    "killmail_id": 123456789,
    "killmail_hash": "abc123...",
    "kill_time": "2024-01-15T14:30:00Z",
    "system_name": "Jita",
    "total_value": 125430000,
    "victim": { /* complete victim data */ },
    "attackers": [ /* complete attacker data */ ],
    "items": [ /* complete item list with values */ ]
  }
}
```

## Implementation Guide

### Basic Polling Loop

```javascript
async function pollKillmails(endpoint, queueID) {
  while (true) {
    try {
      const response = await fetch(`${endpoint}?queueID=${queueID}&ttw=10`);
      const data = await response.json();

      const killmail = data.package || data.killmail;
      if (killmail) {
        await processKillmail(killmail);
      }
    } catch (error) {
      console.error('Polling error:', error);
      await sleep(5000); // Wait on error
    }
  }
}
```

### Error Handling

```javascript
async function robustPolling(endpoint, queueID) {
  let retryCount = 0;
  const maxRetries = 5;

  while (retryCount < maxRetries) {
    try {
      const response = await fetch(`${endpoint}?queueID=${queueID}`, {
        timeout: 15000 // 15 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      retryCount = 0; // Reset on success

      return data;
    } catch (error) {
      retryCount++;
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
      await sleep(delay);
    }
  }

  throw new Error('Max retries exceeded');
}
```

## Key Features

### Position Tracking

- Each client's position automatically tracked via `queueID`
- Uses MongoDB ObjectId for efficient ordering
- 3-hour expiry for inactive clients
- Automatic recovery from invalid positions

### Value Calculations

RedisQ endpoint provides detailed value breakdown:

- `fittedValue`: Ship and fitted modules value
- `droppedValue`: Total value of dropped items
- `destroyedValue`: Total value of destroyed items
- `totalValue`: Complete killmail value

## Rate Limits

- No explicit rate limiting on streaming endpoints
- Natural rate limiting through long-polling mechanism
- Recommended: One connection per application
- Multiple queueIDs supported for different components
