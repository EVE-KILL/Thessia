/**
 * Date Formatting Composable
 *
 * Provides reactive date formatting functions that automatically use the current locale
 */

import { computed } from "vue";
import * as dateUtils from "~/utils/dateUtils";

export function useDateFormatting() {
    const { locale } = useI18n();
    const currentLocale = computed(() => locale.value);

    return {
        /**
         * Format a date as "x time ago" with current locale
         */
        formatTimeAgo: (date: string | Date) =>
            dateUtils.formatTimeAgo(date, currentLocale.value),

        /**
         * Format a date as readable date string with current locale
         */
        formatDateDisplay: (date: string | Date) =>
            dateUtils.formatDateDisplay(date, currentLocale.value),

        /**
         * Format a full datetime with timezone info and current locale
         */
        formatDateTime: (date: string | Date) =>
            dateUtils.formatDateTime(date, currentLocale.value),

        /**
         * Format time with both shortened and full UTC timestamp using current locale
         */
        formatEnhancedTimeDisplay: (date: string | Date) =>
            dateUtils.formatEnhancedTimeDisplay(date, currentLocale.value),

        // These don't need locale, so we can use them directly
        formatShortTimeAgo: dateUtils.formatShortTimeAgo,
        formatYear: dateUtils.formatYear,
        formatTime: dateUtils.formatTime,
        formatTimeRange: dateUtils.formatTimeRange,
        formatSimpleDateTime: dateUtils.formatSimpleDateTime,
        formatShortDate: dateUtils.formatShortDate,
        formatDuration: dateUtils.formatDuration,

        // Also expose the current locale for advanced usage
        currentLocale: currentLocale.value,
    };
}
