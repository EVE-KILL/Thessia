import { RedisStorage, KILLMAIL_PUBSUB_CHANNEL } from "./Storage";

export const COMMENT_PUBSUB_CHANNEL = "comments:events";

// Different types of clients
interface WSClient {
    send: (message: string) => void;
}

// We need separate maps for different types of clients
const killmailClients = new Map<WSClient, string[]>();
// Use null as value since we don't need to store anything specific per client
const commentClients = new Map<WSClient, null>();
let isKillmailSubscribed = false;
let isCommentSubscribed = false;

/**
 * Initialize pub/sub subscription for killmail broadcasts
 * This should be called during app initialization
 */
export function initializeKillmailSubscription() {
    if (isKillmailSubscribed) return;

    const redis = RedisStorage.getInstance();
    redis.subscribe(KILLMAIL_PUBSUB_CHANNEL, (message) => {
        try {
            const data = JSON.parse(message);
            const { killmail, routingKeys } = data;

            // Use the local broadcast function to send to WebSocket clients
            broadcastToKillmailClients(killmail, routingKeys);
        } catch (error) {
            console.error("Error processing killmail from Redis:", error);
        }
    });

    isKillmailSubscribed = true;
    console.debug("Subscribed to killmail broadcasts via Redis");
}

/**
 * Initialize pub/sub subscription for comment events
 */
export function initializeCommentSubscription() {
    if (isCommentSubscribed) return;

    const redis = RedisStorage.getInstance();
    redis.subscribe(COMMENT_PUBSUB_CHANNEL, (message) => {
        try {
            const data = JSON.parse(message);
            broadcastToCommentClients(data);
        } catch (error) {
            console.error("Error processing comment event from Redis:", error);
        }
    });

    isCommentSubscribed = true;
    console.debug("Subscribed to comment events via Redis");
}

export function addKillmailClient(peer: WSClient, topics: string[]) {
    // Ensure we're subscribed to Redis when the first killmail client connects
    if (killmailClients.size === 0) {
        initializeKillmailSubscription();
    }

    killmailClients.set(peer, topics);
}

export function addCommentClient(peer: WSClient) {
    // Ensure we're subscribed to Redis when the first comment client connects
    if (commentClients.size === 0) {
        initializeCommentSubscription();
    }

    // Store the client with null value - we just need the client in the Map
    commentClients.set(peer, null);
}

export function removeKillmailClient(peer: WSClient) {
    killmailClients.delete(peer);
}

export function removeCommentClient(peer: WSClient) {
    commentClients.delete(peer);
}

// For backwards compatibility
export const addClient = addKillmailClient;
export const removeClient = removeKillmailClient;

/**
 * Local function to broadcast to connected killmail WebSocket clients
 */
function broadcastToKillmailClients(killmail: any, routingKeys: string[]) {
    killmailClients.forEach((subscribedTopics, client) => {
        if (subscribedTopics.some((topic) => routingKeys.includes(topic))) {
            try {
                const message = JSON.stringify({
                    type: "killmail",
                    data: killmail,
                });
                client.send(message);
            } catch (error) {
                console.error("Error sending message to client:", error);
            }
        }
    });
}

/**
 * Local function to broadcast to connected comment WebSocket clients
 * Broadcasts to all connected clients without any filtering
 */
function broadcastToCommentClients(commentEvent: any) {
    commentClients.forEach((_, client) => {
        try {
            client.send(commentEvent);
        } catch (error) {
            console.error("Error sending comment event to client:", error);
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
            routingKeys,
        });
    } catch (error) {
        console.error("Error publishing killmail to Redis:", error);
    }
}

/**
 * Publish a comment event to Redis for broadcasting
 * Uses the 'new' event for new comments and 'deleted' for both soft and hard deletes
 */
export async function broadcastCommentEvent(
  eventType: "new" | "deleted",
  comment: any
) {
  try {
    const redis = RedisStorage.getInstance();
    const payload = {
      eventType: eventType,
      comment: comment,
      killIdentifier: comment.killIdentifier,
      timestamp: Date.now()
    };

    await redis.publish(COMMENT_PUBSUB_CHANNEL, payload);
    console.debug(
      `Published ${eventType} comment event to Redis: ${comment.identifier} for kill ${comment.killIdentifier}`
    );
  } catch (error) {
    console.error("Error publishing comment event to Redis:", error);
  }
}
