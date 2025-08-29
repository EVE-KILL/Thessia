/**
 * Date Formatting Utilities
 *
 * Centralized date formatting functions using date-fns for consistent
 * date handling across the entire application.
 */

import { format, formatDistanceToNow } from "date-fns";
import { de, enUS, es, fr, ja, ko, ru, zhCN } from "date-fns/locale";

// Date-fns locale mapping
const dateLocales = {
    en: enUS,
    de: de,
    es: es,
    fr: fr,
    ja: ja,
    ko: ko,
    ru: ru,
    zh: zhCN,
} as const;

/**
 * Get the date-fns locale object for the current locale
 */
function getDateLocale(locale: string) {
    return dateLocales[locale as keyof typeof dateLocales] || enUS;
}

/**
 * Format a date as "x time ago" (e.g., "2 hours ago", "3 days ago")
 * This is the most commonly used format in killboards for showing when kills happened
 */
export function formatTimeAgo(date: string | Date, locale = "en"): string {
    if (!date) return "";

    const parsedDate = typeof date === "string" ? new Date(date) : date;
    if (isNaN(parsedDate.getTime())) return "";

    return formatDistanceToNow(parsedDate, {
        addSuffix: true,
        locale: getDateLocale(locale),
    });
}

/**
 * Format a shortened "time ago" format (e.g., "5m", "2h", "3d")
 * This provides a very compact format for space-constrained displays
 */
export function formatShortTimeAgo(date: string | Date): string {
    if (!date) return "";

    const parsedDate = typeof date === "string" ? new Date(date) : date;
    if (isNaN(parsedDate.getTime())) return "";

    const now = new Date();
    const diffMs = now.getTime() - parsedDate.getTime();

    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

/**
 * Format time with both shortened and full UTC timestamp
 * Returns an object with both short format and full timestamp
 */
export function formatEnhancedTimeDisplay(
    date: string | Date,
    locale = "en"
): {
    short: string;
    date: string;
    time: string;
    timeOnly: string;
} {
    if (!date) return { short: "", date: "", time: "", timeOnly: "" };

    const parsedDate = typeof date === "string" ? new Date(date) : date;
    if (isNaN(parsedDate.getTime()))
        return { short: "", date: "", time: "", timeOnly: "" };

    const fullDateTime = formatDateTime(parsedDate, locale);
    // Split the datetime string - typically "YYYY-MM-DD HH:MM:SS UTC"
    const parts = fullDateTime.split(" ");
    const datePart = parts[0]; // YYYY-MM-DD
    const timePart = parts.slice(1).join(" "); // HH:MM:SS UTC
    const timeOnlyPart = parts[1] ? parts[1].substring(0, 5) : ""; // Just HH:MM (first 5 chars of HH:MM:SS)

    return {
        short: formatShortTimeAgo(parsedDate),
        date: datePart,
        time: timePart,
        timeOnly: timeOnlyPart,
    };
}

/**
 * Format a date as a readable date string (e.g., "1st January 2024")
 */
export function formatDateDisplay(date: string | Date, locale = "en"): string {
    if (!date) return "";

    const parsedDate = typeof date === "string" ? new Date(date) : date;
    if (isNaN(parsedDate.getTime())) return "";

    return format(parsedDate, "do MMMM yyyy", {
        locale: getDateLocale(locale),
    });
}

/**
 * Format just the year from a date
 */
export function formatYear(date: string | Date): string {
    if (!date) return "";

    const parsedDate = typeof date === "string" ? new Date(date) : date;
    if (isNaN(parsedDate.getTime())) return "";

    return format(parsedDate, "yyyy");
}

/**
 * Format time as HH:mm (e.g., "14:30")
 */
export function formatTime(date: string | Date): string {
    if (!date) return "";

    const parsedDate = typeof date === "string" ? new Date(date) : date;
    if (isNaN(parsedDate.getTime())) return "";

    return format(parsedDate, "HH:mm");
}

/**
 * Format a time range (e.g., "14:30 to 16:45")
 */
export function formatTimeRange(
    startTime: string | Date,
    endTime?: string | Date
): string {
    const startFormatted = formatTime(startTime);

    if (!endTime) return startFormatted;

    const endFormatted = formatTime(endTime);
    return `${startFormatted} to ${endFormatted}`;
}

/**
 * Format a full datetime in EVE Time format (e.g., "2024-01-01 14:30:45")
 * Forces UTC display regardless of user's local timezone
 */
export function formatDateTime(date: string | Date, locale = "en"): string {
    if (!date) return "";

    const parsedDate = typeof date === "string" ? new Date(date) : date;
    if (isNaN(parsedDate.getTime())) return "";

    // Force UTC formatting by using toISOString and manually formatting
    const year = parsedDate.getUTCFullYear();
    const month = String(parsedDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getUTCDate()).padStart(2, '0');
    const hours = String(parsedDate.getUTCHours()).padStart(2, '0');
    const minutes = String(parsedDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(parsedDate.getUTCSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Format a simple date for tooltips and detailed views
 */
export function formatSimpleDateTime(date: string | Date): string {
    if (!date) return "";

    const parsedDate = typeof date === "string" ? new Date(date) : date;
    if (isNaN(parsedDate.getTime())) return "";

    return format(parsedDate, "yyyy-MM-dd HH:mm");
}

/**
 * Format a date for display in tables and lists (short format)
 */
export function formatShortDate(date: string | Date): string {
    if (!date) return "";

    const parsedDate = typeof date === "string" ? new Date(date) : date;
    if (isNaN(parsedDate.getTime())) return "";

    return format(parsedDate, "MMM dd");
}

/**
 * Format duration from milliseconds to human readable format (e.g., "2h 30m")
 */
export function formatDuration(durationMs: number | undefined | null): string {
    if (typeof durationMs !== "number" || durationMs <= 0) return "-";

    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    let formatted = "";
    if (hours > 0) {
        formatted += `${hours}h`;
    }
    if (minutes > 0) {
        if (formatted) formatted += " ";
        formatted += `${minutes}m`;
    }

    return formatted || "-";
}

/**
 * Format a date value for datetime-local input fields
 * Converts API date values to the format expected by HTML datetime-local inputs
 * Since users think in EVE time (UTC), we display the UTC time directly
 * @param dateValue - Date string or Date object from API (assumed to be UTC)
 * @returns String in YYYY-MM-DDThh:mm format
 */
export function formatDatetimeForInput(
    dateValue: string | Date | null | undefined
): string {
    if (!dateValue) return "";

    const date =
        typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return "";

    // Since users think in EVE time (UTC), display the UTC time
    return date.toISOString().slice(0, 16); // Format as YYYY-MM-DDThh:mm
}

/**
 * Converts a datetime-local input value to ISO string format for API calls
 * Users input datetime thinking in EVE time (UTC), so we treat the input as UTC
 * @param datetime - The datetime string from an HTML datetime-local input (YYYY-MM-DDTHH:mm)
 * @returns ISO string suitable for MongoDB queries, or null if invalid
 */
export function formatDatetimeForAPI(datetime: string): string | null {
    if (!datetime) return null;

    try {
        // datetime-local format is "YYYY-MM-DDTHH:mm"
        // Users think in EVE time (UTC), so treat input as UTC directly
        // Add seconds if not present and append 'Z' to indicate UTC
        const normalizedDatetime =
            datetime.includes(":") && datetime.split(":").length === 2
                ? `${datetime}:00Z` // Add seconds, mark as UTC
                : `${datetime}Z`; // Mark as UTC

        const date = new Date(normalizedDatetime);

        // Validate the date is actually valid
        if (isNaN(date.getTime())) {
            return null;
        }

        return date.toISOString();
    } catch (error) {
        console.warn("Error formatting datetime for API:", error);
        return null;
    }
}

/**
 * Validate datetime input value and ensure it's within reasonable bounds
 * @param inputValue - Value from datetime-local input
 * @param maxHoursFromNow - Maximum hours from current time (default: 720 = 30 days)
 * @returns Validation result with isValid flag and error message
 */
export function validateDatetimeInput(
    inputValue: string,
    maxHoursFromNow: number = 720
): { isValid: boolean; error?: string } {
    if (!inputValue) {
        return { isValid: false, error: "Date is required" };
    }

    const date = new Date(inputValue);
    if (isNaN(date.getTime())) {
        return { isValid: false, error: "Invalid date format" };
    }

    const now = new Date();
    const diffHours =
        Math.abs(date.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours > maxHoursFromNow) {
        return {
            isValid: false,
            error: `Date must be within ${maxHoursFromNow} hours of current time`,
        };
    }

    return { isValid: true };
}
