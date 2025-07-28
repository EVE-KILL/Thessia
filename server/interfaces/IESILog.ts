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

    // Error handling
    error?: boolean;
    errorMessage?: string;

    // Metadata
    source: string; // e.g., "killmailFetch", "manual", "webhook"
    timestamp: Date; // When the request was made

    createdAt?: Date;
    updatedAt?: Date;
}
