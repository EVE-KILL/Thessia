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
 * Format a full datetime with timezone info (e.g., "2024-01-01 14:30:45 UTC")
 */
export function formatDateTime(date: string | Date, locale = "en"): string {
    if (!date) return "";

    const parsedDate = typeof date === "string" ? new Date(date) : date;
    if (isNaN(parsedDate.getTime())) return "";

    return format(parsedDate, "yyyy-MM-dd HH:mm:ss 'UTC'", {
        locale: getDateLocale(locale),
    });
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
