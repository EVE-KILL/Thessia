# WebSocket API

The application utilizes WebSockets for real-time communication, primarily for broadcasting new killmails as they are processed based on topic subscriptions.

## Connection

Clients can connect to the WebSocket server at `/killmails` endpoint. Upon connection, the server will send a welcome message with available topics.

## Topic-Based Subscriptions

The WebSocket implementation uses a topic-based subscription system. Clients subscribe to specific topics to receive filtered killmail updates.

### Initial Connection Response

When you connect, the server sends:

```json
{
  "type": "info",
  "message": "Welcome! Please reply with a comma-separated list of topics you want to subscribe to.",
  "validTopics": ["all", "10b", "5b", "abyssal", "wspace", "highsec", "lowsec", "nullsec", "bigkills", "solo", "npc", "citadel", "t1", "t2", "t3", "frigates", "destroyers", "cruisers", "battlecruisers", "battleships", "capitals", "freighters", "supercarriers", "titans"]
}
```

### Subscribing to Topics

To subscribe, send a comma-separated list of topics as a plain text message:

```text
all,highsec,capitals
```

### Valid Topics

**Predefined Topics:**

- `all` - All killmails
- `10b` - Killmails worth 10+ billion ISK
- `5b` - Killmails worth 5+ billion ISK
- `abyssal` - Abyssal space kills
- `wspace` - Wormhole space kills
- `highsec` - High security space kills
- `lowsec` - Low security space kills
- `nullsec` - Null security space kills
- `bigkills` - High value kills
- `solo` - Solo kills
- `npc` - NPC kills
- `citadel` - Citadel/structure kills

**Ship Categories:**

- `t1`, `t2`, `t3` - Tech level filters
- `frigates`, `destroyers`, `cruisers`, `battlecruisers`, `battleships`
- `capitals`, `freighters`, `supercarriers`, `titans`

**Dynamic Topics:**

- `victim.{character_id}` - Kills where specific character is victim
- `attacker.{character_id}` - Kills where specific character is attacker
- `system.{system_id}` - Kills in specific system
- `region.{region_id}` - Kills in specific region

### Subscription Responses

**Successful subscription:**

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

**Format error:**

```json
{
  "type": "error",
  "message": "Invalid message format. Please reply with a comma-separated list of topics."
}
```

## Killmail Broadcast Format

When subscribed to relevant topics, the server will broadcast killmail data. The exact format depends on the implementation in `WSClientManager`.

## Implementation Details

- The WebSocket server is handled by Nuxt's `defineWebSocketHandler` in `server/routes/killmails.ts`
- The `WSClientManager` in `server/helpers/WSClientManager.ts` manages client connections and broadcasts messages
- New killmails are broadcast after being processed by the queue system
- The system uses Redis subscriptions to receive new killmail events
- Topic filtering is handled server-side to reduce bandwidth

## Client-Side Usage Example

```javascript
// Connect to the WebSocket
const socket = new WebSocket('ws://localhost:3000/killmails');

socket.onopen = () => {
  console.log('WebSocket connection established.');
  // Server will send welcome message with available topics
};

socket.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'info') {
    console.log('Server message:', message.message);
    console.log('Available topics:', message.validTopics);

    // Subscribe to topics - send as plain text, comma-separated
    socket.send('all,capitals,highsec');

  } else if (message.type === 'subscribed') {
    console.log('Successfully subscribed to:', message.topics);

  } else if (message.type === 'error') {
    console.error('Subscription error:', message.message);

  } else {
    // Handle killmail data broadcasts
    console.log('Received killmail data:', message);
  }
};

socket.onclose = () => {
  console.log('WebSocket connection closed.');
};

socket.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

## Topic Examples

```text
all                           # All killmails
capitals,supercarriers        # Capital and supercapital ships only
victim.90000001               # When character ID 90000001 dies
attacker.90000001             # When character ID 90000001 gets a kill
system.30000142               # Kills in Jita (system ID 30000142)
region.10000002               # Kills in The Forge region
highsec,solo                  # Solo kills in high security space
10b,titans                    # 10+ billion ISK kills and titan kills
```

## Implementation Details

*   The WebSocket server logic is likely handled by `server/plugins/socket.io.ts` (or a similar WebSocket library integration with Nuxt/Nitro).
*   The `WSClientManager` in `server/helpers/WSClientManager.ts` is responsible for managing client connections and broadcasting messages.
*   New killmails are broadcast after being processed by the queue (e.g., in `src/queue/processKillmails.ts` which calls `WSClientManager.broadcastKillmail`).

## Client-Side Usage (Conceptual)

```javascript

