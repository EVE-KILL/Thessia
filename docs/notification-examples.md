# Notification System Documentation

This document provides comprehensive information about the Thessia notification system, including server-side implementation, client-side handling, and usage examples.

## System Overview

The notification system consists of:

- **WebSocket-based delivery** via `/ws/site` endpoint
- **Redis pub/sub** for scalable message broadcasting
- **Toast notifications** with Nuxt UI integration
- **TypeScript interfaces** for type safety
- **Helper functions** for easy implementation
- **Button actions** with customizable styling

## Architecture

### Server-Side Components

1. **WebSocket Server** (`/server/routes/ws/site.ts`) - Handles connections and message routing
2. **Notification Functions** - Helper functions for sending notifications
3. **TypeScript Interfaces** - Type definitions for notifications and buttons
4. **Redis Integration** - Pub/sub for real-time message delivery

### Client-Side Components

1. **SiteWebSocketManager** - Vue component handling WebSocket connections
2. **Toast Integration** - Nuxt UI toast notifications
3. **Button Actions** - Clickable notification buttons with navigation

## Server-Side Implementation

### Available Functions

```typescript
import {
    // Convenience functions for common types
    notifyUserSuccess,
    notifyUserError,
    notifyUserInfo,
    broadcastAnnouncement,

    // General functions for custom notifications
    notifyUser,
    broadcastSiteEvent,
    createNotification,
    createNotificationButton
} from "~/server/routes/ws/site";
```

### Quick Examples

```typescript
// Success notification
await notifyUserSuccess(userId, "Profile Updated", "Your profile has been successfully updated.");

// Error notification
await notifyUserError(userId, "Upload Failed", "There was an error uploading your file.");

// Info notification
await notifyUserInfo(userId, "New Feature", "Check out our new dashboard features!");

// Site-wide announcement
await broadcastAnnouncement("Maintenance Notice", "Site will be down for 30 minutes");
```

### Notifications with buttons/links
```typescript
// Create action buttons
const viewProfileButton = createNotificationButton(
    "View Profile",
    "/profile",
    {
        icon: "i-lucide-user",
        color: "primary",
        variant: "solid"
    }
);

const helpButton = createNotificationButton(
    "Get Help",
    "/help",
    {
        icon: "i-lucide-help-circle",
        color: "neutral"
    }
);

// Send notification with buttons
await notifyUserSuccess(
    userId,
    "Welcome!",
    "Your account has been created successfully.",
    [viewProfileButton, helpButton]
);
```

### Site-wide announcements
```typescript
const announcementButton = createNotificationButton(
    "Read More",
    "/announcements/maintenance",
    {
        icon: "i-lucide-info",
        color: "primary"
    }
);

await broadcastAnnouncement(
    "Scheduled Maintenance",
    "The site will be under maintenance on Sunday from 2-4 AM UTC.",
    [announcementButton]
);
```

### Custom notifications
```typescript
// For more control, use the general functions
const customNotification = createNotification(
    "Custom Alert",
    "This is a custom notification with specific styling.",
    {
        color: "warning",
        icon: "i-lucide-alert-triangle",
        timeout: 10000, // 10 seconds
        buttons: [
            createNotificationButton("Action", "/action", { color: "warning" })
        ]
    }
);

await notifyUser(userId, "notification", customNotification);
```

## TypeScript Interfaces

### NotificationData
```typescript
interface NotificationData {
    title: string;
    description: string;
    color?: "primary" | "secondary" | "success" | "info" | "warning" | "error" | "neutral";
    icon?: string;
    timeout?: number;
    buttons?: NotificationButton[];
}
```

### NotificationButton
```typescript
interface NotificationButton {
    label: string;
    link: string;
    icon?: string;
    color?: "primary" | "secondary" | "success" | "info" | "warning" | "error" | "neutral";
    variant?: "solid" | "outline" | "ghost" | "soft";
}
```

## Client-Side Implementation

### WebSocket Connection

The client automatically connects to `/ws/site` and handles notifications via the `SiteWebSocketManager` component. No manual setup required - just ensure the component is included in your layout.

### Toast Integration

Notifications are automatically displayed as toast messages using Nuxt UI. The toast includes:

- **Title and description** from the notification data
- **Color-coded styling** based on notification type
- **Action buttons** that navigate to specified links
- **Auto-dismiss** with configurable timeout

### Manual Toast Usage

You can also trigger toast notifications manually in Vue components:

```vue
<script setup lang="ts">
const toast = useToast();

function showCustomToast() {
  toast.add({
    title: 'Custom Toast',
    description: 'This is a manually triggered toast',
    color: 'success',
    icon: 'i-heroicons-check-circle',
    actions: [{
      label: 'View Details',
      onClick: () => navigateTo('/details')
    }]
  });
}
</script>
```

## Routing and Targeting

### User-Specific Notifications

User notifications are sent only to the specific user using routing key `user.{userId}`:

```typescript
// Only user with ID "12345" will receive this
await notifyUserSuccess("12345", "Profile Updated", "Changes saved successfully");
```

### Site-Wide Notifications

Site-wide notifications are broadcast to all connected users using routing key `all`:

```typescript
// All connected users will receive this
await broadcastAnnouncement("System Maintenance", "Scheduled downtime at 2 AM UTC");
```

## Error Handling

All notification functions include error handling:

```typescript
try {
    await notifyUserSuccess(userId, "Success", "Operation completed");
} catch (error) {
    console.error("Failed to send notification:", error);
    // Notification failure doesn't break the main application flow
}
```

## Best Practices

### 1. Use Appropriate Colors
- `success` - Completed actions, confirmations
- `error` - Failed operations, validation errors
- `warning` - Important alerts, upcoming changes
- `info` - General information, tips
- `primary` - Important announcements, feature highlights

### 2. Keep Messages Concise
- **Title**: 2-4 words maximum
- **Description**: 1-2 sentences, under 100 characters
- **Button labels**: 1-2 words (e.g., "View", "Edit", "Learn More")

### 3. Provide Clear Actions
```typescript
// Good: Specific action with clear destination
const button = createNotificationButton("View Profile", "/profile", {
    icon: "i-lucide-user",
    color: "primary"
});

// Avoid: Vague actions
const button = createNotificationButton("Click Here", "/", {
    color: "neutral"
});
```

### 4. Set Appropriate Timeouts
- **Success**: 3-5 seconds (quick confirmation)
- **Info**: 5-8 seconds (time to read)
- **Warning**: 8-10 seconds (important to notice)
- **Error**: No timeout or 15+ seconds (needs attention)

```typescript
await notifyUserError(userId, "Upload Failed", "File too large", [], {
    timeout: 0 // Stay visible until manually dismissed
});
```

## Reference

### Notification Colors

Available colors:
- `primary` - Blue (default for announcements)
- `secondary` - Gray
- `success` - Green
- `info` - Blue (default for general notifications)
- `warning` - Yellow
- `error` - Red
- `neutral` - Gray

### Button Variants

Available button variants:
- `solid` - Filled button
- `outline` - Outlined button (default)
- `ghost` - Text-only button
- `soft` - Subtle background

### Common Icons

Commonly used Heroicons:
- `i-heroicons-check-circle` - Success
- `i-heroicons-x-circle` - Error
- `i-heroicons-information-circle` - Info
- `i-heroicons-exclamation-triangle` - Warning
- `i-heroicons-megaphone` - Announcements
- `i-heroicons-bell` - General notifications

Commonly used Lucide icons:
- `i-lucide-external-link` - External links (default for buttons)
- `i-lucide-user` - Profile/user actions
- `i-lucide-settings` - Settings
- `i-lucide-help-circle` - Help/support
- `i-lucide-info` - Information
