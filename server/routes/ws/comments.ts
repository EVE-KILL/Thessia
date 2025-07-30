import { RedisStorage } from "~/server/helpers/Storage";
import {
    addClient,
    broadcastToCommentClients,
    handleClientPong,
    registerWSType,
    removeClient,
} from "~/server/helpers/WSClientManager";

export const COMMENT_PUBSUB_CHANNEL = "comments:events";

/**
 * Broadcast a comment event to all subscribed clients
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
            timestamp: Date.now(),
        };

        await redis.publish(COMMENT_PUBSUB_CHANNEL, payload);
    } catch (error) {
        console.error("Error publishing comment event to Redis:", error);
    }
}

// Register this WebSocket type
registerWSType("comment", {
    channel: COMMENT_PUBSUB_CHANNEL,
    broadcastHandler: broadcastToCommentClients,
    requiresTopics: false,
});

export default defineWebSocketHandler({
    open(peer) {
        addClient("comment", peer);
    },

    message(peer, message) {
        try {
            const data = JSON.parse(message.toString());

            // Handle pong responses to keep connection alive
            if (data.type === "pong") {
                handleClientPong("comment", peer);
            }
            // Add other message handling logic here if needed
        } catch (error) {
            // Ignore non-JSON messages (original behavior)
        }
    },

    close(peer) {
        removeClient("comment", peer);
    },
});
