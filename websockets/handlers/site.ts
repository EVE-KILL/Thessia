/**
 * Site Events WebSocket Handler
 * Topic-based routing for site events (user and component specific)
 */

import type { ClientData, MessageHandler } from "../common";

// Valid topics for site events
export const validTopics = ["all"];
export const partialTopics = ["user.", "component."];

/**
 * Check if a topic is valid for site events
 */
function isValidTopic(topic: string): boolean {
    if (validTopics.includes(topic)) return true;
    return partialTopics.some((prefix) => topic.startsWith(prefix));
}

/**
 * Generate routing keys for site events
 */
function generateRoutingKeys(siteEvent: any): string[] {
    const keys: string[] = ["all"];

    // User-specific routing
    if (siteEvent.userId) {
        keys.push(`user.${siteEvent.userId}`);
    }

    // Component-specific routing
    if (siteEvent.component) {
        keys.push(`component.${siteEvent.component}`);
    }

    return keys;
}

/**
 * Check if site event should be sent to a client
 */
function shouldSendToClient(siteEvent: any, clientData: ClientData): boolean {
    if (clientData.topics.length === 0) return false;
    const routingKeys = generateRoutingKeys(siteEvent);
    return clientData.topics.some((topic) => routingKeys.includes(topic));
}

// Configuration for site events handler
export const siteConfig = {
    validTopics,
    partialTopics,
};

// Message handler for site events
export const siteMessageHandler: MessageHandler = {
    isValidTopic,
    generateRoutingKeys,
    shouldSendToClient,
    getMessageType: (data: any) => "site-event",
    getLogIdentifier: (data: any) => data.type || "unknown",
};
