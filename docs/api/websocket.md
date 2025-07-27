# WebSocket API

The application utilizes WebSockets for real-time communication, primarily for broadcasting new killmails as they are processed.

## Connection

Clients can connect to the WebSocket server. The exact endpoint might vary based on deployment but is typically the root of the application or a `/ws` path.

## Subscriptions

The primary use case for WebSockets in this application is to subscribe to new killmail events.

*   **Subscribe to all new killmails:**
    *   Message: `{"action":"sub","channel":"kills"}`
    *   When a new killmail is processed and saved, the server will broadcast a message on this channel.

*   **Unsubscribe from new killmails:**
    *   Message: `{"action":"unsub","channel":"kills"}`

## Message Format

*   **Killmail Broadcast Message:**
    When a new killmail is available, the server sends a message with the following structure:
    ```json
    {
      "action": "kill", // Indicates a new killmail event
      "data": {
        // This will be the full IKillmail object
        "killmail_id": 123456789,
        "killmail_hash": "unique_killmail_hash",
        "kill_time": "2023-10-28T12:34:56Z",
        "total_value": 150000000.00,
        "victim": {
          "character_id": 90000001,
          "character_name": "Victim Pilot",
          "corporation_id": 98000001,
          "corporation_name": "Victim Corp",
          "alliance_id": 99000001,
          "alliance_name": "Victim Alliance",
          "ship_id": 587, // e.g., Rifter
          "ship_name": { "en": "Rifter" /* ... other languages */ }
          // ... other victim details
        },
        "attackers": [
          {
            "character_id": 90000002,
            "character_name": "Attacker Pilot",
            // ... other attacker details
            "final_blow": true
          }
          // ... other attackers
        ],
        "system_id": 30000142, // Jita
        "system_name": "Jita",
        // ... other fields from the IKillmail interface
      }
    }
    ```

## Implementation Details

*   The WebSocket server logic is likely handled by `server/plugins/socket.io.ts` (or a similar WebSocket library integration with Nuxt/Nitro).
*   The `WSClientManager` in `server/helpers/WSClientManager.ts` is responsible for managing client connections and broadcasting messages.
*   New killmails are broadcast after being processed by the queue (e.g., in `src/queue/processKillmails.ts` which calls `WSClientManager.broadcastKillmail`).

## Client-Side Usage (Conceptual)

```javascript
// Example client-side JavaScript
const socket = new WebSocket('ws://localhost:3000'); // Or your production WebSocket URL

socket.onopen = () => {
  console.log('WebSocket connection established.');
  // Subscribe to kills channel
  socket.send(JSON.stringify({ action: 'sub', channel: 'kills' }));
};

socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.action === 'kill' && message.data) {
    console.log('New killmail received:', message.data);
    // Process the new killmail data (e.g., update UI)
  }
};

socket.onclose = () => {
  console.log('WebSocket connection closed.');
};

socket.onerror = (error) => {
  console.error('WebSocket error:', error);
};

// To unsubscribe (e.g., when component unmounts)
// socket.send(JSON.stringify({ action: 'unsub', channel: 'kills' }));
