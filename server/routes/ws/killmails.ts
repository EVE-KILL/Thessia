import { RedisStorage } from "~/server/helpers/Storage";
import {
    addClient,
    broadcastToKillmailClients,
    handleClientPong,
    registerWSType,
    removeClient,
} from "~/server/helpers/WSClientManager";

export const KILLMAIL_PUBSUB_CHANNEL = "killmail-broadcasts";

/**
 * Broadcast a killmail to all subscribed clients
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

// Register this WebSocket type
registerWSType("killmail", {
    channel: KILLMAIL_PUBSUB_CHANNEL,
    broadcastHandler: broadcastToKillmailClients,
    requiresTopics: true,
});

const validTopics = [
    "all",
    "10b",
    "5b",
    "abyssal",
    "wspace",
    "highsec",
    "lowsec",
    "nullsec",
    "bigkills",
    "solo",
    "npc",
    "citadel",
    "t1",
    "t2",
    "t3",
    "frigates",
    "destroyers",
    "cruisers",
    "battlecruisers",
    "battleships",
    "capitals",
    "freighters",
    "supercarriers",
    "titans",
];

const partialTopics = ["victim.", "attacker.", "system.", "region."];

export default defineWebSocketHandler({
    open(peer) {
        peer.send(
            JSON.stringify({
                type: "info",
                message:
                    "Welcome! Please reply with a comma-separated list of topics you want to subscribe to.",
                validTopics: validTopics,
            })
        );
    },
    async message(peer, message) {
        try {
            // First try to parse as JSON for ping/pong messages
            let data;
            try {
                data = JSON.parse(message.toString());
            } catch {
                // If not JSON, treat as comma-separated topic list (original behavior)
                data = null;
            }

            // Handle pong responses
            if (data && data.type === "pong") {
                handleClientPong("killmail", peer);
                return;
            }

            // Handle topic subscription - support both JSON and plain text
            let topics: string[];
            if (
                data &&
                data.type === "subscribe" &&
                Array.isArray(data.topics)
            ) {
                // New JSON format
                topics = data.topics;
            } else {
                // Original comma-separated string format (backward compatibility)
                topics = message
                    .toString()
                    .split(",")
                    .map((topic) => topic.trim());
            }

            const invalidTopics = topics.filter(
                (topic) =>
                    !validTopics.includes(topic) &&
                    !partialTopics.some((prefix) => topic.startsWith(prefix))
            );

            if (invalidTopics.length > 0) {
                peer.send(
                    JSON.stringify({
                        type: "error",
                        message: `Invalid topics: ${invalidTopics.join(
                            ", "
                        )}. Please reply with a valid list of topics.`,
                    })
                );
                return;
            }

            peer.send(JSON.stringify({ type: "subscribed", topics: topics }));
            addClient("killmail", peer, topics);
        } catch (error) {
            peer.send(
                JSON.stringify({
                    type: "error",
                    message:
                        "Invalid message format. Please reply with a comma-separated list of topics.",
                })
            );
        }
    },
    close(peer) {
        removeClient("killmail", peer);
    },
});
