import { RedisStorage, KILLMAIL_PUBSUB_CHANNEL } from './Storage';

const clients = new Map();
let isSubscribed = false;

/**
 * Initialize pub/sub subscription for killmail broadcasts
 * This should be called during app initialization
 */
export function initializeKillmailSubscription() {
  if (isSubscribed) return;

  const redis = RedisStorage.getInstance();
  redis.subscribe(KILLMAIL_PUBSUB_CHANNEL, (message) => {
    try {
      const data = JSON.parse(message);
      const { killmail, routingKeys } = data;

      // Use the local broadcast function to send to WebSocket clients
      broadcastToClients(killmail, routingKeys);
    } catch (error) {
      console.error('Error processing killmail from Redis:', error);
    }
  });

  isSubscribed = true;
  console.debug('Subscribed to killmail broadcasts via Redis');
}

export function addClient(peer: any, topics: string[]) {
  // Ensure we're subscribed to Redis when the first client connects
  if (clients.size === 0) {
    initializeKillmailSubscription();
  }

  clients.set(peer, topics);
}

export function removeClient(peer: any) {
  clients.delete(peer);
}

/**
 * Local function to broadcast to connected WebSocket clients
 */
function broadcastToClients(killmail: any, routingKeys: string[]) {
  clients.forEach((subscribedTopics, client) => {
    if (subscribedTopics.some((topic) => routingKeys.includes(topic))) {
      try {
        const message = JSON.stringify({ type: "killmail", data: killmail });
        client.send(message);
      } catch (error) {
        console.error('Error sending message to client:', error);
      }
    }
  });
}

/**
 * Publish a killmail to Redis for broadcasting
 * This should be used by processing workers instead of directly broadcasting
 */
export async function broadcastKillmail(killmail: any, routingKeys: string[]) {
  try {
    const redis = RedisStorage.getInstance();
    await redis.publish(KILLMAIL_PUBSUB_CHANNEL, {
      killmail,
      routingKeys
    });
  } catch (error) {
    console.error('Error publishing killmail to Redis:', error);
  }
}
