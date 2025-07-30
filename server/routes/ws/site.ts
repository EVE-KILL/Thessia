import {
    SITE_PUBSUB_CHANNEL,
} from "~/server/helpers/Websocket";
import {
    addClient,
    broadcastToSiteClients,
    handleClientPong,
    registerWSType,
    removeClient,
} from "~/server/helpers/WSClientManager";

// Register this WebSocket type
registerWSType("site", {
    channel: SITE_PUBSUB_CHANNEL,
    broadcastHandler: broadcastToSiteClients,
    requiresTopics: false,
});

export default defineWebSocketHandler({
    open(peer) {
        addClient("site", peer);

        // Send welcome message with subscription instructions
        peer.send(
            JSON.stringify({
                type: "info",
                message:
                    "Welcome to site events! Send a comma-separated list of topics (e.g., 'all' or 'all,user.{identifier}').",
            })
        );
    },

    message(peer, message) {
        try {
            // First try to parse as JSON for ping/pong messages
            let data;
            try {
                data = JSON.parse(message.toString());
            } catch {
                // If not JSON, treat as comma-separated topic list (like killmails)
                data = null;
            }

            // Handle pong responses to keep connection alive
            if (data && data.type === "pong") {
                handleClientPong("site", peer);
                return;
            }

            // Handle topic subscription - support both JSON and plain text
            let topics: string[];
            if (
                data &&
                data.type === "subscribe" &&
                Array.isArray(data.topics)
            ) {
                // New JSON format (for future compatibility)
                topics = data.topics;
            } else {
                // Plain text comma-separated string format (like killmails)
                topics = message
                    .toString()
                    .split(",")
                    .map((topic) => topic.trim());
            }

            // Validate topics - allow 'all', 'user.{id}', 'component.{name}'
            const validTopics = topics.filter((topic) => {
                return (
                    topic === "all" ||
                    topic.startsWith("user.") ||
                    topic.startsWith("component.")
                );
            });

            if (validTopics.length === 0) {
                peer.send(
                    JSON.stringify({
                        type: "error",
                        message:
                            "Invalid topics. Valid formats: 'all', 'user.{identifier}', 'component.{name}'",
                    })
                );
                return;
            }

            // Subscribe to the valid topics
            peer.send(
                JSON.stringify({
                    type: "subscribed",
                    topics: validTopics,
                })
            );

            addClient("site", peer, validTopics);
        } catch (error) {
            // Handle non-JSON messages or invalid subscription requests
            peer.send(
                JSON.stringify({
                    type: "error",
                    message:
                        "Invalid message format. Send a comma-separated list of topics (e.g., 'all' or 'all,user.{identifier}').",
                })
            );
        }
    },

    close(peer) {
        removeClient("site", peer);
    },
});
