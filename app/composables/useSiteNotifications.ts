import { onMounted, onUnmounted } from "vue";

interface NotificationData {
    title: string;
    description?: string;
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
    actions?: Array<{
        label: string;
        click: () => void;
    }>;
}

/**
 * Composable for handling site notifications via WebSocket
 * Automatically shows toast notifications when user_notification events are received
 */
export const useSiteNotificationHandler = () => {
    const toast = useToast();
    const { addEventListener, removeEventListener } = useSiteWebSocket({
        connectionType: "notifications",
    });

    /**
     * Handle incoming user notification events
     */
    const handleUserNotification = (event: any) => {
        // Only handle user_notification events
        if (event.eventType !== "user_notification") {
            return;
        }

        const { notificationType, data } = event;

        // Extract notification data with defaults
        const notificationData: NotificationData = {
            title: data.title || "Notification",
            description: data.description,
            color: data.color || "info",
            icon: data.icon,
            timeout: data.timeout || 5000,
            actions: data.actions,
        };

        // Show the toast notification
        toast.add({
            id: `notification-${event.timestamp}`, // Unique ID to prevent duplicates
            title: notificationData.title,
            description: notificationData.description,
            color: notificationData.color,
            icon: notificationData.icon,
            actions: notificationData.actions,
        });
    };

    let cleanup: (() => void) | null = null;

    onMounted(() => {
        // Listen for user notification events
        cleanup = addEventListener("user_notification", handleUserNotification);
    });

    onUnmounted(() => {
        // Clean up event listener
        if (cleanup) {
            cleanup();
        }
    });

    return {
        // Expose methods for manual toast notifications if needed
        showNotification: (data: NotificationData) => {
            toast.add({
                id: `manual-${Date.now()}`,
                title: data.title,
                description: data.description,
                color: data.color,
                icon: data.icon,
                actions: data.actions,
            });
        },
    };
};
