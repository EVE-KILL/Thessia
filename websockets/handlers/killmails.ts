/**
 * Killmail WebSocket Handler
 * Topic-based routing and validation for killmail events
 */

import type { ClientData, MessageHandler } from "../common";

// Valid topics (matching existing implementation)
export const validTopics = [
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

export const partialTopics = ["victim.", "attacker.", "system.", "region."];

/**
 * Check if a topic is valid
 */
function isValidTopic(topic: string): boolean {
    if (validTopics.includes(topic)) return true;
    return partialTopics.some((prefix) => topic.startsWith(prefix));
}

/**
 * Generate routing keys for a killmail
 */
function generateRoutingKeys(killmail: any): string[] {
    const keys: string[] = ["all"];

    // Value-based routing
    if (killmail.killValue >= 10_000_000_000) keys.push("10b");
    if (killmail.killValue >= 5_000_000_000) keys.push("5b");
    if (killmail.killValue >= 1_000_000_000) keys.push("bigkills");

    // System-based routing
    if (killmail.solarSystemId) keys.push(`system.${killmail.solarSystemId}`);
    if (killmail.regionId) keys.push(`region.${killmail.regionId}`);

    // Victim-based routing
    if (killmail.victim) {
        if (killmail.victim.characterId)
            keys.push(`victim.${killmail.victim.characterId}`);
        if (killmail.victim.corporationId)
            keys.push(`victim.${killmail.victim.corporationId}`);
        if (killmail.victim.allianceId)
            keys.push(`victim.${killmail.victim.allianceId}`);
    }

    // Attacker-based routing
    if (killmail.attackers && Array.isArray(killmail.attackers)) {
        killmail.attackers.forEach((attacker: any) => {
            if (attacker.characterId)
                keys.push(`attacker.${attacker.characterId}`);
            if (attacker.corporationId)
                keys.push(`attacker.${attacker.corporationId}`);
            if (attacker.allianceId)
                keys.push(`attacker.${attacker.allianceId}`);
        });
    }

    return keys;
}

/**
 * Check if killmail should be sent to a client
 */
function shouldSendToClient(killmail: any, clientData: ClientData): boolean {
    if (clientData.topics.length === 0) return false;
    const routingKeys = generateRoutingKeys(killmail);
    return clientData.topics.some((topic) => routingKeys.includes(topic));
}

// Configuration for killmail handler
export const killmailConfig = {
    validTopics,
    partialTopics,
};

// Message handler for killmail-specific logic
export const killmailMessageHandler: MessageHandler = {
    isValidTopic,
    generateRoutingKeys,
    shouldSendToClient,
    getMessageType: (data: any) => "killmail",
    getLogIdentifier: (data: any) => data.killmailId || "unknown",
};
