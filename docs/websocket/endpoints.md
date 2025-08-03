# WebSocket Endpoints

## Overview

EVE-KILL provides three main WebSocket endpoints for real-time data## Comments WebSocket

**Endpoint:** `wss://w## Site Events WebSocket

**Endpoint:** `wss://ws.eve-kill.com/site`

Site-wide notifications and events with topic-based filtering.

### Site Connection

```javascript
const ws = new WebSocket('wss://ws.eve-kill.com/site');
```

### Site Topicsm/comments`

Real-time comment system events. No topic subscription required.

### Comments Connection

```javascript
const ws = new WebSocket('wss://ws.eve-kill.com/comments');
```

### Comments Message Formatll endpoints are available through the dedicated WebSocket domain.

## Killmails WebSocket

**Endpoint:** `wss://ws.eve-kill.com/killmails`

Real-time killmail events with topic-based filtering.

### Connection

```javascript
const ws = new WebSocket('wss://ws.eve-kill.com/killmails');
```

### Topics

Subscribe to specific data streams:

| Topic | Description | Example |
|-------|-------------|---------|
| `all` | All killmails | `all` |
| `10b` | 10B+ ISK killmails | `10b` |
| `5b` | 5B+ ISK killmails | `5b` |
| `abyssal` | Abyssal space kills | `abyssal` |
| `wspace` | Wormhole space kills | `wspace` |
| `highsec` | High security kills | `highsec` |
| `lowsec` | Low security kills | `lowsec` |
| `nullsec` | Null security kills | `nullsec` |
| `bigkills` | High-value kills | `bigkills` |
| `solo` | Solo kills | `solo` |
| `npc` | NPC kills | `npc` |
| `citadel` | Citadel kills | `citadel` |
| `t1` | Tech 1 ships | `t1` |
| `t2` | Tech 2 ships | `t2` |
| `t3` | Tech 3 ships | `t3` |
| `frigates` | Frigate kills | `frigates` |
| `destroyers` | Destroyer kills | `destroyers` |
| `cruisers` | Cruiser kills | `cruisers` |
| `battlecruisers` | Battlecruiser kills | `battlecruisers` |
| `battleships` | Battleship kills | `battleships` |
| `capitals` | Capital ship kills | `capitals` |
| `freighters` | Freighter kills | `freighters` |
| `supercarriers` | Supercarrier kills | `supercarriers` |
| `titans` | Titan kills | `titans` |

### Partial Topics

| Topic Format | Description | Example |
|--------------|-------------|---------|
| `victim.{id}` | Specific victim | `victim.123456` |
| `attacker.{id}` | Specific attacker | `attacker.789012` |
| `system.{id}` | Solar system kills | `system.30000142` |
| `region.{id}` | Regional kills | `region.10000002` |

### Subscription Examples

```javascript
// Subscribe to all killmails
ws.send('all');

// Subscribe to high-value kills
ws.send('10b,5b');

// Subscribe to specific ship types
ws.send('capitals,titans');

// Subscribe to location-specific kills
ws.send('system.30000142,region.10000002');

// JSON format
ws.send(JSON.stringify({
    type: 'subscribe',
    topics: ['all', '10b', 'solo']
}));
```

### Message Format

Killmails are sent as JSON messages with the structure:

```json
{
    "type": "killmail",
    "data": {
        // Full killmail object - see Message Formats documentation
    }
}
```

For complete message structure and field definitions, see **[Message Formats](./message-formats.md)**.

## Comments WebSocket

**Endpoint:** `wss://ws.eve-kill.com/comments`

Real-time comment system events. No topic subscription required.

### Connection

```javascript
const ws = new WebSocket('wss://ws.eve-kill.com/comments');
```

### Message Format

```json
{
    "type": "comment",
    "data": {
        "comment_id": 789,
        "killmail_id": 123456789,
        "user_id": 456,
        "content": "Nice kill!",
        "created_at": "2024-08-03T12:05:00Z"
    }
}
```

### Events

- New comments posted
- Comment updates/edits
- Comment deletions

## Site Events WebSocket

**Endpoint:** `ws://your-domain.com/site`

Site-wide notifications and events with topic-based filtering.

### Connection

```javascript
const ws = new WebSocket('wss://ws.eve-kill.com/site');
```

### Topics

| Topic Format | Description | Example |
|--------------|-------------|---------|
| `all` | All site events | `all` |
| `user.{id}` | User-specific events | `user.123` |
| `component.{name}` | Component events | `component.navbar` |

### Site Subscription Examples

```javascript
// Subscribe to all site events
ws.send('all');

// Subscribe to user-specific events
ws.send('user.123');

// Subscribe to multiple topics
ws.send('all,user.123,component.navbar');

// JSON format
ws.send(JSON.stringify({
    type: 'subscribe',
    topics: ['all', 'user.123']
}));
```

### Site Message Format

```json
{
    "type": "notification",
    "data": {
        "id": "notif_456",
        "user_id": 123,
        "title": "New Achievement",
        "message": "You've unlocked a new achievement!",
        "type": "achievement",
        "created_at": "2024-08-03T12:10:00Z"
    }
}
```

## Connection Management

### Welcome Messages

Each endpoint sends a welcome message upon connection:

```json
{
    "type": "info",
    "message": "Welcome to killmail events! Send a comma-separated list of topics..."
}
```

### Ping/Pong

Keep connections alive with ping/pong:

```javascript
// Send ping
ws.send(JSON.stringify({ type: 'ping' }));

// Handle pong response
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'pong') {
        console.log('Connection alive');
    }
};
```

### Error Responses

```json
{
    "type": "error",
    "message": "Invalid topics. Valid formats: 'all', character ID, 'alliance:{id}'..."
}
```

### Subscription Confirmation

```json
{
    "type": "subscribed",
    "topics": ["all", "123456"]
}
```
