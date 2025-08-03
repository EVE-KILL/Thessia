# WebSocket API Documentation

EVE-KILL provides real-time data streaming through WebSocket connections for killmails, comments, and site events.

## Overview

The WebSocket system is designed to be completely standalone and emit events to Redis queues. The Nuxt application handles client connections and Redis subscriptions through dedicated WebSocket routes.

## Architecture

The system uses a publisher-subscriber pattern where:
- Application events are published to Redis channels
- WebSocket clients connect to Nuxt routes
- Nuxt routes subscribe to Redis channels
- Messages are routed to subscribed clients based on topics

## Available Endpoints

| Endpoint | Description | Requires Topics | URL |
|----------|-------------|-----------------|-----|
| `/killmails` | Real-time killmail events | Yes | `wss://ws.eve-kill.com/killmails` |
| `/comments` | Comment system events | No | `wss://ws.eve-kill.com/comments` |
| `/site` | Site-wide notifications | Yes | `wss://ws.eve-kill.com/site` |

## Quick Start

### Basic Connection

```javascript
// Connect to killmails WebSocket
const ws = new WebSocket('wss://ws.eve-kill.com/killmails');

ws.onopen = () => {
    // Subscribe to all killmails
    ws.send('all');
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Received:', data);
};
```

### Topic Subscription

```javascript
// Subscribe to specific topics
ws.send('all,10b,solo');

// Or use JSON format
ws.send(JSON.stringify({
    type: 'subscribe',
    topics: ['all', '10b', 'solo']
}));
```

## Documentation Sections

- **[Endpoints](./endpoints.md)** - Detailed endpoint specifications
- **[Message Formats](./message-formats.md)** - Request/response structures
- **[Topics & Routing](./topics.md)** - Topic-based message filtering
- **[Error Handling](./error-handling.md)** - Error codes and handling

## Redis Integration

The WebSocket system uses Redis pub/sub for message distribution:

- **`killmail-broadcasts`** - Killmail events
- **`comments:events`** - Comment events
- **`site:events`** - Site notifications

## Status Codes

| Code | Description |
|------|-------------|
| 1000 | Normal closure |
| 1003 | Unsupported data |
| 1008 | Policy violation |
| 1011 | Internal server error |

## Support

For WebSocket-related issues:

- Check the [Error Handling](./error-handling.md) guide
- File an issue on GitHub with connection logs
