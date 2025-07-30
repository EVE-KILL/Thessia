import { KILLMAIL_PUBSUB_CHANNEL, RedisStorage } from "./Storage";

export const COMMENT_PUBSUB_CHANNEL = "comments:events";

// Different types of clients with enhanced tracking
interface WSClient {
  send: (message: string) => void;
  id?: string; // Add unique identifier for tracking
}

interface ClientInfo {
  lastPingSent: number;
  lastPongReceived: number;
  isAlive: boolean;
  topics?: string[]; // For killmail clients
}

// Enhanced client tracking with connection health monitoring
const killmailClients = new Map<WSClient, ClientInfo>();
const commentClients = new Map<WSClient, ClientInfo>();

// Connection health configuration
const PING_INTERVAL = 30000; // 30 seconds
const PING_TIMEOUT = 5000; // 5 seconds to respond to ping
const HEALTH_CHECK_INTERVAL = 10000; // 10 seconds - check frequently for pings and cleanup

// Global subscription state
let isKillmailSubscribed = false;
let isCommentSubscribed = false;
let killmailUnsubscribe: (() => Promise<void>) | null = null;
let commentUnsubscribe: (() => Promise<void>) | null = null;

// Health check intervals
let killmailHealthCheck: NodeJS.Timeout | null = null;
let commentHealthCheck: NodeJS.Timeout | null = null;

/**
 * Initialize pub/sub subscription for killmail broadcasts with proper cleanup
 * Only creates one Redis subscription that's shared among all clients
 */
export async function initializeKillmailSubscription() {
  if (isKillmailSubscribed) return;

  const redis = RedisStorage.getInstance();
  
  // Create the subscription callback
  const subscriptionCallback = (message: string) => {
    try {
      const data = JSON.parse(message);
      const { killmail, routingKeys } = data;
      broadcastToKillmailClients(killmail, routingKeys);
    } catch (error) {
      console.error("Error processing killmail from Redis:", error);
    }
  };

  // Subscribe to Redis
  await redis.subscribe(KILLMAIL_PUBSUB_CHANNEL, subscriptionCallback);
  
  // Store unsubscribe function for cleanup
  killmailUnsubscribe = async () => {
    await redis.unsubscribe(KILLMAIL_PUBSUB_CHANNEL, subscriptionCallback);
  };

  isKillmailSubscribed = true;

  // Start health check for killmail clients
  startKillmailHealthCheck();
}

/**
 * Initialize pub/sub subscription for comment events with proper cleanup
 */
export async function initializeCommentSubscription() {
  if (isCommentSubscribed) return;

  const redis = RedisStorage.getInstance();
  
  // Create the subscription callback
  const subscriptionCallback = (message: string) => {
    try {
      const data = JSON.parse(message);
      broadcastToCommentClients(data);
    } catch (error) {
      console.error("Error processing comment event from Redis:", error);
    }
  };

  // Subscribe to Redis
  await redis.subscribe(COMMENT_PUBSUB_CHANNEL, subscriptionCallback);
  
  // Store unsubscribe function for cleanup
  commentUnsubscribe = async () => {
    await redis.unsubscribe(COMMENT_PUBSUB_CHANNEL, subscriptionCallback);
  };

  isCommentSubscribed = true;

  // Start health check for comment clients
  startCommentHealthCheck();
}

export function addKillmailClient(peer: WSClient, topics: string[]) {
  // Ensure we're subscribed to Redis when the first killmail client connects
  if (killmailClients.size === 0) {
    initializeKillmailSubscription();
  }

  killmailClients.set(peer, {
    lastPingSent: Date.now(),
    lastPongReceived: Date.now(),
    isAlive: true,
    topics: topics
  });
}

export function addCommentClient(peer: WSClient) {
  // Ensure we're subscribed to Redis when the first comment client connects
  if (commentClients.size === 0) {
    initializeCommentSubscription();
  }

  commentClients.set(peer, {
    lastPingSent: Date.now(),
    lastPongReceived: Date.now(),
    isAlive: true
  });
}

export async function removeKillmailClient(peer: WSClient) {
  killmailClients.delete(peer);

  // Clean up Redis subscription if no clients remain
  if (killmailClients.size === 0) {
    await cleanupKillmailSubscription();
  }
}export async function removeCommentClient(peer: WSClient) {
  commentClients.delete(peer);

  // Clean up Redis subscription if no clients remain
  if (commentClients.size === 0) {
    await cleanupCommentSubscription();
  }
}

// For backwards compatibility
export const addClient = addKillmailClient;
export const removeClient = removeKillmailClient;

/**
 * Cleanup functions for Redis subscriptions
 */
async function cleanupKillmailSubscription() {
  if (killmailUnsubscribe) {
    await killmailUnsubscribe();
    killmailUnsubscribe = null;
  }
  isKillmailSubscribed = false;
  
  if (killmailHealthCheck) {
    clearInterval(killmailHealthCheck);
    killmailHealthCheck = null;
  }
}

async function cleanupCommentSubscription() {
  if (commentUnsubscribe) {
    await commentUnsubscribe();
    commentUnsubscribe = null;
  }
  isCommentSubscribed = false;
  
  if (commentHealthCheck) {
    clearInterval(commentHealthCheck);
    commentHealthCheck = null;
  }
}

/**
 * Health check functions to monitor client connections
 */
function startKillmailHealthCheck() {
  if (killmailHealthCheck) return;
  
  killmailHealthCheck = setInterval(() => {
    const now = Date.now();
    const deadClients: WSClient[] = [];
    
    killmailClients.forEach((clientInfo, client) => {
      // Check if client is responsive (no pong received within timeout after ping was sent)
      if (!clientInfo.isAlive && (now - clientInfo.lastPingSent > PING_TIMEOUT)) {
        deadClients.push(client);
        return;
      }
      
      // Send ping if it's time
      if (now - clientInfo.lastPingSent > PING_INTERVAL) {
        try {
          client.send(JSON.stringify({ type: "ping", timestamp: now }));
          clientInfo.lastPingSent = now;
          clientInfo.isAlive = false; // Will be set to true when pong is received
        } catch (error) {
          deadClients.push(client);
        }
      }
    });
    
    // Remove dead clients
    deadClients.forEach(client => removeKillmailClient(client));
  }, HEALTH_CHECK_INTERVAL);
}

function startCommentHealthCheck() {
  if (commentHealthCheck) return;
  
  commentHealthCheck = setInterval(() => {
    const now = Date.now();
    const deadClients: WSClient[] = [];
    
    commentClients.forEach((clientInfo, client) => {
      // Check if client is responsive (no pong received within timeout after ping was sent)
      if (!clientInfo.isAlive && (now - clientInfo.lastPingSent > PING_TIMEOUT)) {
        deadClients.push(client);
        return;
      }
      
      // Send ping if it's time
      if (now - clientInfo.lastPingSent > PING_INTERVAL) {
        try {
          client.send(JSON.stringify({ type: "ping", timestamp: now }));
          clientInfo.lastPingSent = now;
          clientInfo.isAlive = false; // Will be set to true when pong is received
        } catch (error) {
          deadClients.push(client);
        }
      }
    });
    
    // Remove dead clients
    deadClients.forEach(client => removeCommentClient(client));
  }, HEALTH_CHECK_INTERVAL);
}

/**
 * Handle pong responses from clients
 */
export function handleKillmailClientPong(peer: WSClient) {
  const clientInfo = killmailClients.get(peer);
  if (clientInfo) {
    clientInfo.lastPongReceived = Date.now();
    clientInfo.isAlive = true;
  }
}

export function handleCommentClientPong(peer: WSClient) {
  const clientInfo = commentClients.get(peer);
  if (clientInfo) {
    clientInfo.lastPongReceived = Date.now();
    clientInfo.isAlive = true;
  }
}

/**
 * Local function to broadcast to connected killmail WebSocket clients
 */
function broadcastToKillmailClients(killmail: any, routingKeys: string[]) {
  killmailClients.forEach((clientInfo, client) => {
    if (clientInfo.topics && clientInfo.topics.some((topic: string) => routingKeys.includes(topic))) {
      try {
        const message = JSON.stringify({
          type: "killmail",
          data: killmail,
        });
        client.send(message);
      } catch (error) {
        console.error("Error sending message to killmail client:", error);
        // Mark client for removal on next health check
        clientInfo.isAlive = false;
      }
    }
  });
}

/**
 * Local function to broadcast to connected comment WebSocket clients
 * Broadcasts to all connected clients without any filtering
 */
function broadcastToCommentClients(commentEvent: any) {
  commentClients.forEach((clientInfo, client) => {
    try {
      client.send(commentEvent);
    } catch (error) {
      console.error("Error sending comment event to client:", error);
      // Mark client for removal on next health check
      clientInfo.isAlive = false;
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
export async function broadcastCommentEvent(eventType: "new" | "deleted", comment: any) {
  try {
    const redis = RedisStorage.getInstance();
    const payload = {
      eventType: eventType,
      comment: comment,
      killIdentifier: comment.killIdentifier,
      timestamp: Date.now(),
    };

    await redis.publish(COMMENT_PUBSUB_CHANNEL, payload);
  } catch (error) {
    console.error("Error publishing comment event to Redis:", error);
  }
}

/**
 * Statistics and monitoring functions
 */
export function getKillmailClientCount(): number {
  return killmailClients.size;
}

export function getCommentClientCount(): number {
  return commentClients.size;
}

export function getSubscriptionStatus() {
  return {
    killmail: isKillmailSubscribed,
    comment: isCommentSubscribed
  };
}

export function getConnectionHealth(type: 'killmail' | 'comment') {
  const clients = type === 'killmail' ? killmailClients : commentClients;
  const now = Date.now();
  let healthy = 0;
  let unhealthy = 0;
  
  clients.forEach((clientInfo) => {
    if (clientInfo.isAlive && (now - clientInfo.lastPongReceived) < (PING_INTERVAL + PING_TIMEOUT)) {
      healthy++;
    } else {
      unhealthy++;
    }
  });
  
  return { healthy, unhealthy, total: clients.size };
}
