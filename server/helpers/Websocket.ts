import { RedisStorage } from "~/server/helpers/Storage";

// WebSocket channels
export const SITE_PUBSUB_CHANNEL = "site:events";
export const KILLMAIL_PUBSUB_CHANNEL = "killmail-broadcasts";
export const COMMENT_PUBSUB_CHANNEL = "comments:events";

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

// ============================================================================
// KILLMAIL WEBSOCKET FUNCTIONS
// ============================================================================

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

// ============================================================================
// COMMENT WEBSOCKET FUNCTIONS
// ============================================================================

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
