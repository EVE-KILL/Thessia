/**
 * Comments WebSocket Handler
 * Simple broadcasting for comment events (no topic filtering)
 */

import type { MessageHandler } from "../common";

// Configuration for comments handler (no topics)
export const commentsConfig = {};

// Message handler for comments (simple broadcasting, no topics)
export const commentsMessageHandler: MessageHandler = {
    getMessageType: (data: any) => "comment",
    getLogIdentifier: (data: any) => data.id || "unknown",
};
