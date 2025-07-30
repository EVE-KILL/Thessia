# WebSocket API

The application provides real-time WebSocket communication for two main purposes:
- **Killmail broadcasts** (`/ws/killmails`) - Real-time killmail updates with topic-based filtering
- **Comment events** (`/ws/comments`) - Real-time comment notifications for killmails

## Health Monitoring

All WebSocket connections implement a ping/pong health monitoring system:

- **Server ping interval**: 30 seconds
- **Client response time**: 5 seconds to respond with pong
- **Connection cleanup**: 60 seconds for unresponsive clients

### Ping/Pong Protocol

#### Server → Client (Ping)
```json
{
  "type": "ping",
  "timestamp": 1643723400000
}
```

#### Client → Server (Pong)
```json
{
  "type": "pong",
  "timestamp": 1643723400000
}
```

**Important**: Clients must respond to ping messages within 5 seconds or the connection will be terminated.

## Killmail WebSocket (`/ws/killmails`)

### Connection Flow

1. **Connect** to `/ws/killmails`
2. **Receive** welcome message with available topics
3. **Send** subscription message (comma-separated or JSON format)
4. **Receive** subscription confirmation
5. **Start receiving** killmail broadcasts based on subscribed topics
6. **Respond** to ping messages to maintain connection

### Initial Connection Response

```json
{
  "type": "info",
  "message": "Welcome! Please reply with a comma-separated list of topics you want to subscribe to.",
  "validTopics": ["all", "10b", "5b", "abyssal", "wspace", "highsec", "lowsec", "nullsec", "bigkills", "solo", "npc", "citadel", "t1", "t2", "t3", "frigates", "destroyers", "cruisers", "battlecruisers", "battleships", "capitals", "freighters", "supercarriers", "titans"]
}
```

### Subscription Formats

#### Legacy Format (Comma-separated string)
```text
all,highsec,capitals
```

#### JSON Format (Recommended)
```json
{
  "type": "subscribe",
  "topics": ["all", "capitals", "titans"]
}
```

### Subscription Responses

**Success:**
```json
{
  "type": "subscribed",
  "topics": ["all", "capitals"]
}
```

**Invalid topics:**
```json
{
  "type": "error",
  "message": "Invalid topics: invalid_topic. Please reply with a valid list of topics."
}
```

### Valid Topics

**General Categories:**
- `all` - All killmails
- `bigkills` - High value kills
- `solo` - Solo kills
- `npc` - NPC kills

**Value-based:**
- `10b` - Killmails worth 10+ billion ISK
- `5b` - Killmails worth 5+ billion ISK

**Security Zones:**
- `highsec` - High security space kills
- `lowsec` - Low security space kills
- `nullsec` - Null security space kills
- `wspace` - Wormhole space kills

**Special Locations:**
- `abyssal` - Abyssal space kills
- `citadel` - Citadel/structure kills

**Tech Levels:**
- `t1`, `t2`, `t3` - Tech level filters

**Ship Classes:**
- `frigates`, `destroyers`, `cruisers`, `battlecruisers`, `battleships`
- `capitals`, `freighters`, `supercarriers`, `titans`

**Dynamic Filters:**
- `victim.{character_id}` - Kills where specific character is victim
- `attacker.{character_id}` - Kills where specific character is attacker  
- `system.{system_id}` - Kills in specific system
- `region.{region_id}` - Kills in specific region

### Example Subscriptions

```text
# All killmails
all

# High-value capital kills
capitals,supercarriers,10b

# Specific character tracking
victim.90000001,attacker.90000001

# Regional monitoring
system.30000142,region.10000002

# High-sec solo kills
highsec,solo
```

## Comments WebSocket (`/ws/comments`)

### Connection Flow

1. **Connect** to `/ws/comments`
2. **Start receiving** all comment events immediately (no subscription needed)
3. **Respond** to ping messages to maintain connection

### Comment Event Format

```json
{
  "eventType": "new",
  "comment": {
    "identifier": "comment_12345",
    "killIdentifier": "killmail_67890", 
    "content": "Great fight!",
    "character": {
      "id": 90000001,
      "name": "Character Name"
    },
    "timestamp": "2024-01-01T12:00:00Z"
  },
  "killIdentifier": "killmail_67890",
  "timestamp": 1643723400000
}
```

#### Event Types
- `new` - New comment posted
- `deleted` - Comment removed (soft or hard delete)

## Client Implementation Example

```javascript
// Killmail WebSocket with ping/pong handling
const killmailWs = new WebSocket('wss://your-domain.com/ws/killmails');

killmailWs.onopen = () => {
  console.log('Connected to killmail stream');
  // Subscribe to topics
  killmailWs.send('all,capitals,titans');
};

killmailWs.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  // Handle ping/pong
  if (data.type === 'ping') {
    killmailWs.send(JSON.stringify({
      type: 'pong', 
      timestamp: data.timestamp
    }));
    return;
  }
  
  // Handle other message types
  switch (data.type) {
    case 'info':
      console.log('Server info:', data.message);
      break;
    case 'subscribed':
      console.log('Subscribed to:', data.topics);
      break;
    case 'error':
      console.error('Subscription error:', data.message);
      break;
    default:
      // Handle killmail data
      console.log('New killmail:', data);
  }
};

// Comments WebSocket  
const commentsWs = new WebSocket('wss://your-domain.com/ws/comments');

commentsWs.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  // Handle ping/pong
  if (data.type === 'ping') {
    commentsWs.send(JSON.stringify({
      type: 'pong',
      timestamp: data.timestamp  
    }));
    return;
  }
  
  // Handle comment events
  if (data.eventType) {
    console.log(`Comment ${data.eventType}:`, data.comment);
  }
};
```

## Connection Management

### Automatic Features
- **Health monitoring**: Automatic ping/pong every 30 seconds
- **Dead connection cleanup**: Unresponsive clients removed after 60 seconds  
- **Resource management**: Redis subscriptions cleaned up when no clients remain
- **Error handling**: Failed message sends trigger client removal

### Best Practices
- Always implement ping/pong handling for connection stability
- Use JSON subscription format for new implementations
- Handle connection errors gracefully with reconnection logic
- Monitor connection status and implement fallback mechanisms

### Migration Notes
- Legacy comma-separated subscriptions still supported
- Existing clients should add ping/pong handling for improved stability
- No breaking changes to message formats or subscription behavior

