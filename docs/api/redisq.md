# RedisQ API

The RedisQ API provides zKillboard-compatible HTTP long-polling endpoints for real-time killmail delivery. This is perfect for applications that need to consume killmails as they happen, similar to zKillboard's RedisQ service.

## Endpoints

### RedisQ Compatible Endpoint

**GET** `/redisq/`

A fully compatible implementation of zKillboard's RedisQ service for seamless migration of existing applications.

#### Query Parameters

| Parameter | Type   | Required | Default | Description |
|-----------|--------|----------|---------|-------------|
| queueID   | string | Yes      | -       | Unique identifier for the client queue |
| ttw       | number | No       | 10      | Time to wait in seconds (1-10) |

#### Response Format

Returns a zKillboard-compatible RedisQ response:

```json
{
  "package": {
    "killID": 123456789,
    "killmail": {
      "killmail_id": 123456789,
      "killmail_time": "2024-01-15T14:30:00Z",
      "solar_system_id": 30000142,
      "victim": {
        "ship_type_id": 670,
        "character_id": 123456,
        "corporation_id": 654321,
        "alliance_id": 987654,
        "faction_id": 0,
        "damage_taken": 15420,
        "position": {
          "x": 1234567890.0,
          "y": -987654321.0,
          "z": 456789123.0
        }
      },
      "attackers": [
        {
          "ship_type_id": 17918,
          "character_id": 789456,
          "corporation_id": 456789,
          "alliance_id": 321654,
          "faction_id": 0,
          "damage_done": 8932,
          "final_blow": true,
          "security_status": -2.1,
          "weapon_type_id": 2977
        }
      ]
    },
    "zkb": {
      "locationID": 40009077,
      "hash": "abc123def456ghi789jkl012mno345pqr678stu",
      "fittedValue": 125430000,
      "droppedValue": 45230000,
      "destroyedValue": 80200000,
      "totalValue": 125430000,
      "points": 0,
      "npc": false,
      "solo": false,
      "awox": false,
      "href": "https://esi.evetech.net/v1/killmails/123456789/abc123def456ghi789jkl012mno345pqr678stu",
      "createdAt": "2024-01-15T14:30:15.123Z",
      "labels": []
    }
  }
}
```

When no killmail is available after the timeout period:

```json
{
  "package": null
}
```

#### Usage Examples

**Basic Usage**
```bash
curl "https://thessia.eve-kill.com/redisq/?queueID=myapp-v1"
```

**With Custom Timeout**
```bash
curl "https://thessia.eve-kill.com/redisq/?queueID=myapp-v1&ttw=5"
```

**JavaScript Example**
```javascript
async function pollRedisQ() {
  const queueID = 'myapp-v1';
  
  while (true) {
    try {
      const response = await fetch(`https://thessia.eve-kill.com/redisq/?queueID=${queueID}&ttw=10`);
      const data = await response.json();
      
      if (data.package) {
        console.log('New killmail:', data.package.killID);
        // Process the killmail
        processKillmail(data.package);
      } else {
        console.log('No new killmails, continuing...');
      }
    } catch (error) {
      console.error('Error polling RedisQ:', error);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s on error
    }
  }
}

function processKillmail(package) {
  const killmail = package.killmail;
  const zkb = package.zkb;
  
  console.log(`Killmail ${killmail.killmail_id} in ${killmail.solar_system_id}`);
  console.log(`Total value: ${zkb.totalValue.toLocaleString()} ISK`);
  console.log(`Victim: ${killmail.victim.ship_type_id} (${killmail.victim.character_id})`);
}
```

### Full Killmail Stream Endpoint

**GET** `/stream/`

A comprehensive killmail streaming endpoint that provides complete killmail data including items and all metadata.

#### Query Parameters

| Parameter | Type   | Required | Default | Description |
|-----------|--------|----------|---------|-------------|
| queueID   | string | Yes      | -       | Unique identifier for the client queue |
| ttw       | number | No       | 10      | Time to wait in seconds (1-10) |

#### Response Format

Returns complete killmail data:

```json
{
  "killmail": {
    "killmail_id": 123456789,
    "killmail_hash": "abc123def456ghi789jkl012mno345pqr678stu",
    "kill_time": "2024-01-15T14:30:00Z",
    "kill_time_str": "2024-01-15 14:30:00",
    "system_id": 30000142,
    "system_name": "Jita",
    "system_security": 0.946,
    "constellation_id": 20000020,
    "constellation_name": "Kimotoro",
    "region_id": 10000002,
    "region_name": "The Forge",
    "total_value": 125430000,
    "ship_value": 85200000,
    "fitting_value": 40230000,
    "is_npc": false,
    "is_solo": false,
    "war_id": 0,
    "near": "Jita IV - Moon 4 - Caldari Navy Assembly Plant",
    "dna": "670::",
    "x": 1234567890.0,
    "y": -987654321.0,
    "z": 456789123.0,
    "victim": {
      "ship_id": 670,
      "ship_name": {"en": "Capsule"},
      "ship_group_id": 29,
      "ship_group_name": {"en": "Capsule"},
      "character_id": 123456,
      "character_name": "Victim Name",
      "corporation_id": 654321,
      "corporation_name": "Victim Corp",
      "alliance_id": 987654,
      "alliance_name": "Victim Alliance",
      "faction_id": 0,
      "faction_name": "",
      "damage_taken": 15420
    },
    "attackers": [
      {
        "ship_id": 17918,
        "ship_name": {"en": "Dramiel"},
        "ship_group_id": 324,
        "ship_group_name": {"en": "Assault Frigate"},
        "character_id": 789456,
        "character_name": "Attacker Name",
        "corporation_id": 456789,
        "corporation_name": "Attacker Corp",
        "alliance_id": 321654,
        "alliance_name": "Attacker Alliance",
        "faction_id": 0,
        "faction_name": "",
        "damage_done": 8932,
        "final_blow": true,
        "security_status": -2.1,
        "weapon_type_id": 2977,
        "weapon_type_name": {"en": "Small Pulse Laser II"}
      }
    ],
    "items": [
      {
        "type_id": 1234,
        "name": {"en": "Item Name"},
        "group_id": 567,
        "group_name": {"en": "Group Name"},
        "category_id": 89,
        "flag": 5,
        "qty_dropped": 1,
        "qty_destroyed": 0,
        "singleton": 0,
        "value": 1500000,
        "items": []
      }
    ]
  }
}
```

When no killmail is available:

```json
{
  "killmail": null
}
```

#### Usage Examples

**Basic Usage**
```bash
curl "https://thessia.eve-kill.com/stream/?queueID=myapp-v1"
```

**JavaScript Example**
```javascript
async function pollKillmailStream() {
  const queueID = 'myapp-stream-v1';
  
  while (true) {
    try {
      const response = await fetch(`https://thessia.eve-kill.com/stream/?queueID=${queueID}&ttw=10`);
      const data = await response.json();
      
      if (data.killmail) {
        console.log('New killmail:', data.killmail.killmail_id);
        // Process the complete killmail with all data
        processFullKillmail(data.killmail);
      } else {
        console.log('No new killmails, continuing...');
      }
    } catch (error) {
      console.error('Error polling stream:', error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

function processFullKillmail(killmail) {
  console.log(`Killmail ${killmail.killmail_id} in ${killmail.system_name}`);
  console.log(`Total value: ${killmail.total_value.toLocaleString()} ISK`);
  console.log(`Items count: ${killmail.items.length}`);
  
  // Process items
  killmail.items.forEach(item => {
    if (item.qty_dropped > 0) {
      console.log(`Dropped: ${item.qty_dropped}x ${item.name.en} (${item.value.toLocaleString()} ISK)`);
    }
    if (item.qty_destroyed > 0) {
      console.log(`Destroyed: ${item.qty_destroyed}x ${item.name.en} (${item.value.toLocaleString()} ISK)`);
    }
  });
}
```

## Implementation Details

### Long-Polling Mechanism

Both endpoints use HTTP long-polling to provide real-time killmail delivery:

1. **Client connects** with a unique `queueID`
2. **Server checks** for new killmails since the client's last position
3. **If killmail available**: Returns immediately with the killmail data
4. **If no killmail**: Waits up to `ttw` seconds, polling every 500ms
5. **Client position** is automatically tracked using Redis storage
6. **Timeout handling**: Returns `null` if no killmail arrives within the timeout

### Client Position Tracking

- Each client's position is tracked using their `queueID`
- Position is stored as MongoDB ObjectId for efficient querying
- Positions expire after 3 hours of inactivity
- New clients automatically start from the newest available killmail
- Invalid positions are reset to start fresh

### Performance Characteristics

- **MongoDB queries** use efficient `_id` indexing for O(log n) lookups
- **Redis storage** provides fast client state management
- **Value calculations** are optimized for minimal CPU usage
- **Memory efficient** streaming with proper resource cleanup

### Error Handling

- **Invalid queueID**: Returns `{package: null}` or `{killmail: null}`
- **Database errors**: Logged and return null response
- **Redis errors**: Fallback to database-only operation
- **Network timeouts**: Automatic retry with exponential backoff recommended

### Migration from zKillboard

The RedisQ endpoint (`/redisq/`) is fully compatible with zKillboard's RedisQ:

```javascript
// Change this:
const url = 'https://redisq.zkillboard.com/listen.php?queueID=myapp';

// To this:
const url = 'https://thessia.eve-kill.com/redisq/?queueID=myapp';
```

All response formats, field names, and behavior are identical to ensure seamless migration.

## Rate Limiting

- No explicit rate limiting on these endpoints
- Natural rate limiting through long-polling mechanism
- Recommended to use single connection per application
- Multiple queueIDs supported for different application components

## Best Practices

1. **Use unique queueIDs** to avoid conflicts with other applications
2. **Handle null responses** gracefully 
3. **Implement exponential backoff** on errors
4. **Monitor connection health** and reconnect as needed
5. **Process killmails quickly** to avoid blocking the polling loop
6. **Use appropriate timeout values** (5-10 seconds recommended)
7. **Log errors** for debugging and monitoring

## Examples and Libraries

### Python Example
```python
import requests
import time
import json

def poll_redisq(queue_id):
    url = f"https://thessia.eve-kill.com/redisq/"
    params = {"queueID": queue_id, "ttw": 10}
    
    while True:
        try:
            response = requests.get(url, params=params, timeout=15)
            data = response.json()
            
            if data.get("package"):
                print(f"New killmail: {data['package']['killID']}")
                process_killmail(data["package"])
            else:
                print("No new killmails")
                
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(5)

def process_killmail(package):
    killmail = package["killmail"]
    zkb = package["zkb"]
    print(f"Value: {zkb['totalValue']:,} ISK")
    print(f"System: {killmail['solar_system_id']}")

if __name__ == "__main__":
    poll_redisq("myapp-python-v1")
```

### Node.js Example
```javascript
const axios = require('axios');

class RedisQClient {
  constructor(queueID) {
    this.queueID = queueID;
    this.running = false;
  }
  
  async start() {
    this.running = true;
    console.log(`Starting RedisQ client with queue: ${this.queueID}`);
    
    while (this.running) {
      try {
        const response = await axios.get('https://thessia.eve-kill.com/redisq/', {
          params: { queueID: this.queueID, ttw: 10 },
          timeout: 15000
        });
        
        if (response.data.package) {
          await this.onKillmail(response.data.package);
        }
      } catch (error) {
        console.error('RedisQ error:', error.message);
        await this.sleep(5000);
      }
    }
  }
  
  stop() {
    this.running = false;
  }
  
  async onKillmail(package) {
    console.log(`Received killmail: ${package.killID}`);
    // Override this method in your implementation
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const client = new RedisQClient('myapp-node-v1');
client.onKillmail = async (package) => {
  console.log(`Processing killmail ${package.killID}`);
  console.log(`Value: ${package.zkb.totalValue.toLocaleString()} ISK`);
};

client.start();
```
