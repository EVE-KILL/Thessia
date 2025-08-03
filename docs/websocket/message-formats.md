# Message Formats

## Standard Message Structure

All WebSocket messages follow a consistent JSON structure:

```json
{
    "type": "message_type",
    "data": {
        // Message-specific data
    }
}
```

## Client-to-Server Messages

### Subscription Request

Subscribe to topics for filtered message delivery:

```json
{
    "type": "subscribe",
    "topics": ["all", "capitals", "nullsec"]
}
```

**Alternative plain text format:**
```text
all,capitals,nullsec
```

### Unsubscription Request

```json
{
    "type": "unsubscribe",
    "topics": ["capitals"]
}
```

### Ping Message

Keep the connection alive:

```json
{
    "type": "ping"
}
```

### Pong Response

Respond to server ping:

```json
{
    "type": "pong"
}
```

## Server-to-Client Messages

### Welcome Message

Sent when connection is established:

```json
{
    "type": "info",
    "message": "Welcome to killmail events! Send a comma-separated list of topics...",
    "data": {
        "validTopics": ["all"],
        "partialTopics": ["alliance:", "corporation:", "character:", "region:", "system:"]
    }
}
```

### Subscription Confirmation

```json
{
    "type": "subscribed",
    "topics": ["all", "123456"]
}
```

### Unsubscription Confirmation

```json
{
    "type": "unsubscribed",
    "topics": ["123456"]
}
```

### Error Messages

```json
{
    "type": "error",
    "message": "Invalid topics. Valid formats: 'all', character ID, 'alliance:{id}'..."
}
```

### Ping Request

Server-initiated keep-alive:

```json
{
    "type": "ping"
}
```

## Data Messages

### Killmail Event

```json
{
    "type": "killmail",
    "data": {
        "killmail_hash": "abc123def456",
        "killmail_id": 123456789,
        "kill_time": "2024-08-03T12:00:00.000Z",
        "kill_time_str": "2024-08-03 12:00:00",
        "system_id": 30000142,
        "system_name": "Jita",
        "system_security": 0.9456,
        "constellation_id": 20000020,
        "constellation_name": "Kimotoro",
        "region_id": 10000002,
        "region_name": {
            "en": "The Forge"
        },
        "x": 166464115200,
        "y": 66085396480,
        "z": -2207905382400,
        "near": "Jita IV - Moon 4 - Caldari Navy Assembly Plant",
        "total_value": 1234567890,
        "ship_value": 15000000,
        "fitting_value": 1219567890,
        "is_npc": false,
        "is_solo": true,
        "war_id": 0,
        "dna": "670:::",
        "victim": {
            "character_id": 123456,
            "character_name": "Victim Name",
            "corporation_id": 987654,
            "corporation_name": "Victim Corp",
            "alliance_id": 456789,
            "alliance_name": "Victim Alliance",
            "faction_id": 0,
            "faction_name": "",
            "ship_id": 670,
            "ship_name": {
                "en": "Capsule"
            },
            "ship_group_id": 29,
            "ship_group_name": {
                "en": "Capsule"
            },
            "damage_taken": 1000
        },
        "attackers": [
            {
                "character_id": 789012,
                "character_name": "Attacker Name",
                "corporation_id": 345678,
                "corporation_name": "Attacker Corp",
                "alliance_id": 901234,
                "alliance_name": "Attacker Alliance",
                "faction_id": 0,
                "faction_name": "",
                "ship_id": 17812,
                "ship_name": {
                    "en": "Rifter"
                },
                "ship_group_id": 25,
                "ship_group_name": {
                    "en": "Frigate"
                },
                "weapon_type_id": 3170,
                "weapon_type_name": {
                    "en": "200mm AutoCannon I"
                },
                "damage_done": 800,
                "final_blow": true,
                "security_status": 0.1
            }
        ],
        "items": [
            {
                "type_id": 19540,
                "name": {
                    "en": "High-grade Snake Alpha"
                },
                "group_id": 738,
                "group_name": {
                    "en": "Cyberneural Network Modifier"
                },
                "category_id": 20,
                "flag": 89,
                "qty_dropped": 0,
                "qty_destroyed": 1,
                "singleton": 0,
                "value": 125000000
            }
        ]
    }
}
```

### Comment Event

```json
{
    "type": "comment",
    "data": {
        "comment_id": 789,
        "killmail_id": 123456789,
        "user_id": 456,
        "user_name": "Commenter",
        "content": "Nice kill! 🎯",
        "created_at": "2024-08-03T12:05:00Z",
        "updated_at": null,
        "is_edited": false
    }
}
```

### Site Event

```json
{
    "type": "notification",
    "data": {
        "id": "notif_456",
        "user_id": 123,
        "title": "New Achievement Unlocked",
        "message": "You've earned the 'First Blood' achievement!",
        "category": "achievement",
        "priority": "normal",
        "created_at": "2024-08-03T12:10:00Z",
        "expires_at": "2024-08-03T13:10:00Z",
        "action_url": "/achievements/first-blood",
        "metadata": {
            "achievement_id": "first_blood",
            "points_earned": 100
        }
    }
}
```

## Field Descriptions

### Common Fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Message type identifier |
| `data` | object | Message payload |

### Killmail Fields

| Field | Type | Description |
|-------|------|-------------|
| `killmail_id` | number | Unique killmail identifier |
| `kill_time` | string | ISO 8601 timestamp |
| `system_id` | number | EVE system ID |
| `total_value` | number | Total ISK value |
| `victim` | object | Victim information |
| `attackers` | array | List of attackers |
| `items` | array | Dropped/destroyed items |


| `awox` | boolean | Friendly fire |

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| `INVALID_TOPICS` | Invalid topics provided | Topic format is incorrect |
| `SUBSCRIPTION_FAILED` | Failed to subscribe | Internal subscription error |
| `RATE_LIMITED` | Too many requests | Rate limit exceeded |
| `INVALID_FORMAT` | Invalid message format | JSON parsing failed |
| `UNAUTHORIZED` | Unauthorized access | Authentication failed |

## Data Types

- **Timestamps**: ISO 8601 format (`YYYY-MM-DDTHH:mm:ssZ`)
- **IDs**: Positive integers
- **Names**: UTF-8 strings, max 255 characters
- **ISK Values**: Floating point numbers with 2 decimal precision
- **Boolean flags**: `true` or `false`
