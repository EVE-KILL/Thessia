<script setup lang="ts">
import { onMounted } from 'vue'

/**
 * SiteWebSocketManager - Initializes and manages the global site WebSocket connection
 *
 * This component should be included in the main layout to ensure the site WebSocket
 * is connected throughout the application lifecycle. It provides no UI but manages
 * the connection state and handles toast notifications for user events.
 */

const { connect, addEventListener } = useSiteNotifications({
    autoConnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 10
})

const toast = useToast()

// Handle notifications
addEventListener('user_notification', (event) => {
    if (event.data) {
        const toastOptions = {
            title: event.data.title || 'Notification',
            description: event.data.description,
            color: event.data.color || 'info',
            icon: event.data.icon || 'i-heroicons-bell'
        }

        // Add actions if buttons are provided
        if (event.data.buttons && Array.isArray(event.data.buttons)) {
            toastOptions.actions = event.data.buttons.map(button => ({
                label: button.label,
                icon: button.icon || 'i-lucide-external-link',
                color: button.color || 'neutral',
                variant: button.variant || 'outline',
                onClick: (e) => {
                    e?.stopPropagation()

                    if (button.link) {
                        // Handle navigation for links
                        if (button.link.startsWith('http')) {
                            window.open(button.link, '_blank')
                        } else {
                            navigateTo(button.link)
                        }
                    }
                    // Handle custom click actions if provided
                    if (button.action && typeof button.action === 'function') {
                        button.action()
                    }
                }
            }))
        }

        toast.add(toastOptions)
    }
})

// Handle site-wide notifications
addEventListener('notification', (event) => {
    if (event.data) {
        const toastOptions = {
            title: event.data.title || 'Site Notification',
            description: event.data.description,
            color: event.data.color || 'info',
            icon: event.data.icon || 'i-heroicons-megaphone'
        }

        // Add actions if buttons are provided
        if (event.data.buttons && Array.isArray(event.data.buttons)) {
            toastOptions.actions = event.data.buttons.map(button => ({
                label: button.label,
                icon: button.icon || 'i-lucide-external-link',
                color: button.color || 'neutral',
                variant: button.variant || 'outline',
                onClick: (e) => {
                    e?.stopPropagation()

                    if (button.link) {
                        // Handle navigation for links
                        if (button.link.startsWith('http')) {
                            window.open(button.link, '_blank')
                        } else {
                            navigateTo(button.link)
                        }
                    }
                    // Handle custom click actions if provided
                    if (button.action && typeof button.action === 'function') {
                        button.action()
                    }
                }
            }))
        }

        toast.add(toastOptions)
    }
})

// Initialize connection on mount
onMounted(() => {
    if (import.meta.client) {
        connect()
    }
})
</script>

<template>
    <!-- This component has no visual output -->
</template>
