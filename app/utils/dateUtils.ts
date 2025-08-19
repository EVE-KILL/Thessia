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
