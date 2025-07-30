# WebSocket Client Implementation Guide

This guide covers all WebSocket endpoints available in the Thessia application, including connection health monitoring, subscription patterns, and message handling.

## Available WebSocket Endpoints

- **`/ws/killmails`** - Real-time killmail notifications with topic-based subscriptions
- **`/ws/comments`** - Real-time comment notifications for killmails
- **`/ws/site`** - Site-wide notifications and user-specific notifications

## Connection Health Monitoring

All WebSocket servers implement a ping/pong mechanism to ensure connection health and automatically cleanup dead connections. This prevents Redis connection buildup and improves resource management.

### Ping/Pong Protocol

- **Server sends ping**: Every 30 seconds, the server sends a ping message
- **Client must respond**: Clients have 5 seconds to respond with a pong
- **Connection cleanup**: Unresponsive clients are automatically disconnected after 1 minute

### Message Format

#### Ping (Server → Client)
```json
{
  "type": "ping",
  "timestamp": 1643723400000
}
```

#### Pong (Client → Server)
```json
{
  "type": "pong",
  "timestamp": 1643723400000
}
```

### Client Implementation Example

```javascript
const ws = new WebSocket('wss://your-domain.com/ws/killmails');

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);

  if (data.type === 'ping') {
    // Respond to ping immediately
    ws.send(JSON.stringify({
      type: 'pong',
      timestamp: data.timestamp
    }));
    return;
  }

  // Handle other message types
  if (data.type === 'killmail') {
    // Process killmail data
    console.log('Received killmail:', data.data);
  }
};

ws.onopen = function() {
  // For killmail websocket, subscribe to topics
  ws.send('all,capitals,titans'); // or JSON format

  // Alternative JSON format:
  // ws.send(JSON.stringify({
  //   type: 'subscribe',
  //   topics: ['all', 'capitals', 'titans']
  // }));
};
```

## Site Notifications WebSocket (`/ws/site`)

The site notifications WebSocket provides real-time notifications for user-specific alerts and site-wide announcements. It uses a user-based routing system to deliver targeted notifications.

### Authentication

The site WebSocket requires user authentication via cookies. Ensure the user is logged in before connecting.

### Routing Keys

The WebSocket uses routing keys to target specific users or broadcast to all users:

- **User-specific**: `user.{userId}` - Only receives notifications for that specific user
- **Site-wide**: `all` - Receives all site-wide announcements and broadcasts

### Message Types

#### User Notifications
```json
{
  "eventType": "user_notification",
  "notificationType": "notification",
  "data": {
    "title": "Profile Updated",
    "description": "Your profile has been successfully updated.",
    "color": "success",
    "icon": "i-heroicons-check-circle",
    "timeout": 5000,
    "buttons": [
      {
        "label": "View Profile",
        "link": "/profile",
        "icon": "i-lucide-user",
        "color": "primary",
        "variant": "outline"
      }
    ]
  },
  "timestamp": 1643723400000,
  "routingKeys": ["user.12345"]
}
```

#### Site-wide Notifications
```json
{
  "eventType": "notification",
  "notificationType": "notification",
  "data": {
    "title": "Scheduled Maintenance",
    "description": "The site will be under maintenance on Sunday from 2-4 AM UTC.",
    "color": "primary",
    "icon": "i-heroicons-megaphone",
    "buttons": [
      {
        "label": "Read More",
        "link": "/announcements/maintenance",
        "icon": "i-lucide-info",
        "color": "primary",
        "variant": "outline"
      }
    ]
  },
  "timestamp": 1643723400000,
  "routingKeys": ["all"]
}
```

### Client Implementation Example

```javascript
const ws = new WebSocket('wss://your-domain.com/ws/site');

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);

  // Handle ping/pong
  if (data.type === 'ping') {
    ws.send(JSON.stringify({
      type: 'pong',
      timestamp: data.timestamp
    }));
    return;
  }

  // Handle notifications
  if (data.eventType === 'user_notification' || data.eventType === 'notification') {
    const notification = data.data;

    // Display toast notification
    showToast({
      title: notification.title,
      description: notification.description,
      color: notification.color,
      icon: notification.icon,
      timeout: notification.timeout,
      actions: notification.buttons?.map(btn => ({
        label: btn.label,
        onClick: () => window.location.href = btn.link
      }))
    });
  }
};

ws.onopen = function() {
  console.log('Connected to site notifications');
  // No subscription message needed - routing is handled server-side
};
```

## Killmail WebSocket (`/ws/killmails`)

### Subscription Message Formats

The killmail WebSocket supports multiple subscription formats for backward compatibility:

#### Comma-separated string (legacy)
```
"all,capitals,titans"
```

#### JSON format (recommended)
```json
{
  "type": "subscribe",
  "topics": ["all", "capitals", "titans"]
}
```

### Valid Topics

- **General**: `all`, `bigkills`, `solo`, `npc`
- **Value-based**: `10b`, `5b`
- **Security**: `highsec`, `lowsec`, `nullsec`, `wspace`
- **Special**: `abyssal`, `citadel`
- **Tech levels**: `t1`, `t2`, `t3`
- **Ship classes**: `frigates`, `destroyers`, `cruisers`, `battlecruisers`, `battleships`, `capitals`, `freighters`, `supercarriers`, `titans`
- **Dynamic prefixes**: `victim.{id}`, `attacker.{id}`, `system.{id}`, `region.{id}`

## Comments WebSocket (`/ws/comments`)

The comments WebSocket automatically broadcasts all comment events to connected clients. No subscription message is required - simply connect and start receiving events.

### Received Message Format
```json
{
  "eventType": "new",
  "comment": {
    "identifier": "comment_id",
    "killIdentifier": "killmail_id",
    "content": "Great fight!",
    // ... other comment fields
  },
  "killIdentifier": "killmail_id",
  "timestamp": 1643723400000
}
```

## Connection Management Features

### Automatic Cleanup
- Dead connections are automatically detected and removed
- Redis subscriptions are properly cleaned up when no clients remain
- Memory and resource leaks are prevented

### Health Monitoring
- Ping interval: 30 seconds
- Pong timeout: 5 seconds
- Client cleanup: 60 seconds

### Error Handling
- Failed message sends mark clients for removal
- Invalid JSON messages are ignored gracefully
- Connection errors are logged for debugging

## Migration from Old Implementation

If you have existing WebSocket clients, they should continue working with minimal changes:

1. **Add ping/pong handling** (required for connection stability)
2. **Update error handling** to handle new message types
3. **Consider using JSON format** for better future compatibility

The legacy comma-separated subscription format is still supported but the JSON format is recommended for new implementations.
