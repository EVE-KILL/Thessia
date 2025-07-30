import { COMMENT_PUBSUB_CHANNEL } from "~/server/helpers/Websocket";
import {
    addClient,
    broadcastToCommentClients,
    handleClientPong,
    registerWSType,
    removeClient,
} from "~/server/helpers/WSClientManager";

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
