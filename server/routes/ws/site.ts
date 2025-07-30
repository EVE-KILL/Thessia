import { RedisStorage } from "~/server/helpers/Storage";
import {
    addClient,
    broadcastToSiteClients,
    handleClientPong,
    registerWSType,
    removeClient,
} from "~/server/helpers/WSClientManager";

export const SITE_PUBSUB_CHANNEL = "site:events";

// Notification interfaces
export interface NotificationButton {
    label: string;
    icon?: string;
    color?:
        | "primary"
        | "secondary"
        | "success"
        | "info"
        | "warning"
        | "error"
        | "neutral";
    variant?: "solid" | "outline" | "soft" | "ghost";
    link?: string;
}

export interface NotificationData {
    title: string;
    description: string;
    color?:
        | "primary"
        | "secondary"
        | "success"
        | "info"
        | "warning"
        | "error"
        | "neutral";
    icon?: string;
    timeout?: number;
    buttons?: NotificationButton[];
}

/**
 * Create a notification with optional action buttons
 */
export function createNotification(
    title: string,
    description: string,
    options: {
        color?: NotificationData["color"];
        icon?: string;
        timeout?: number;
        buttons?: NotificationButton[];
    } = {}
): NotificationData {
    return {
        title,
        description,
        color: options.color || "info",
        icon: options.icon || "i-heroicons-bell",
        timeout: options.timeout,
        buttons: options.buttons,
    };
}

/**
 * Create a notification button
 */
export function createNotificationButton(
    label: string,
    link: string,
    options: {
        icon?: string;
        color?: NotificationButton["color"];
        variant?: NotificationButton["variant"];
    } = {}
): NotificationButton {
    return {
        label,
        link,
        icon: options.icon || "i-lucide-external-link",
        color: options.color || "neutral",
        variant: options.variant || "outline",
    };
}

// Convenience functions for common notification patterns

/**
 * Send a success notification to a user
 */
export async function notifyUserSuccess(
    userId: string | number,
    title: string,
    description: string,
    buttons?: NotificationButton[]
) {
    const notification = createNotification(title, description, {
        color: "success",
        icon: "i-heroicons-check-circle",
        buttons,
    });
    await notifyUser(userId, "notification", notification);
}

/**
 * Send an error notification to a user
 */
export async function notifyUserError(
    userId: string | number,
    title: string,
    description: string,
    buttons?: NotificationButton[]
) {
    const notification = createNotification(title, description, {
        color: "error",
        icon: "i-heroicons-x-circle",
        buttons,
    });
    await notifyUser(userId, "notification", notification);
}

/**
 * Send an info notification to a user
 */
export async function notifyUserInfo(
    userId: string | number,
    title: string,
    description: string,
    buttons?: NotificationButton[]
) {
    const notification = createNotification(title, description, {
        color: "info",
        icon: "i-heroicons-information-circle",
        buttons,
    });
    await notifyUser(userId, "notification", notification);
}

/**
 * Send a site-wide announcement
 */
export async function broadcastAnnouncement(
    title: string,
    description: string,
    buttons?: NotificationButton[]
) {
    const notification = createNotification(title, description, {
        color: "primary",
        icon: "i-heroicons-megaphone",
        buttons,
    });
    await broadcastSiteEvent("notification", notification);
}

/**
 * Broadcast a site event to all subscribed clients
 */
export async function broadcastSiteEvent(
    eventType: string,
    data: NotificationData
) {
    try {
        const redis = RedisStorage.getInstance();
        const payload = {
            eventType: eventType,
            data: data,
            timestamp: Date.now(),
        };

        await redis.publish(SITE_PUBSUB_CHANNEL, payload);
    } catch (error) {
        console.error("Error publishing site event to Redis:", error);
    }
}

/**
 * Notify a specific user with an event
 */
export async function notifyUser(
    userId: string | number,
    eventType: string,
    data: NotificationData
) {
    try {
        const redis = RedisStorage.getInstance();
        const payload = {
            eventType: "user_notification",
            notificationType: eventType,
            data: data,
            timestamp: Date.now(),
        };

        // Use routing keys to target only the specific user
        const routingKeys = [`user.${userId}`];

        await redis.publish(SITE_PUBSUB_CHANNEL, {
            ...payload,
            routingKeys,
        });
    } catch (error) {
        console.error("Error notifying user:", error);
    }
}

/**
 * Notify components about data updates or other events
 */
export async function notifyComponent(
    componentName: string,
    eventType: string,
    data: any
) {
    try {
        const redis = RedisStorage.getInstance();
        const payload = {
            eventType: "component_notification",
            targetComponent: componentName,
            notificationType: eventType,
            data: data,
            timestamp: Date.now(),
        };

        // Use routing keys to target specific component subscriptions
        const routingKeys = [`component.${componentName}`, "all"];

        await redis.publish(SITE_PUBSUB_CHANNEL, {
            ...payload,
            routingKeys,
        });
    } catch (error) {
        console.error(
            "Error publishing component notification to Redis:",
            error
        );
    }
}

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
