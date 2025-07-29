/**
 * Interface representing an ESI API call log entry
 * This provides transparency for users to see what data is being fetched with their authentication
 */
export interface IESILog {
    // User identification
    characterId: number;
    characterName: string;

    // ESI call details
    endpoint: string; // e.g., "/characters/{character_id}/killmails/recent/"

    // Data transparency
    dataType: string; // e.g., "killmails", "corporation_killmails", "character_info"
    itemsReturned?: number; // Number of items returned (e.g., number of killmails)
    killmailDelay?: number; // Delay setting applied to this fetch (in hours)
    fetchedData?: Array<{
        id: number | string; // The ID/identifier of the fetched item (e.g., killmail ID, character ID, etc.)
        hash?: string; // Optional hash for items that have one (e.g., killmail hash)
        additionalInfo?: Record<string, any>; // Any additional context-specific data
    }>; // Array of fetched items with their identifiers for linking/transparency

    // Error handling
    error?: boolean;
    errorMessage?: string;

    // Metadata
    source: string; // e.g., "killmailFetch", "manual", "webhook"
    timestamp: Date; // When the request was made

    createdAt?: Date;
    updatedAt?: Date;
}
