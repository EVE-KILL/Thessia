// Format numbers according to the user's locale and preferences (With fallback to en-US)
export function numberFormat(value: number): string {
    if (typeof value !== "number" || isNaN(value)) {
        return "0";
    }

    // Use current i18n locale or fallback to 'en-US' for consistent number formatting
    // This ensures the same formatting in both development and production
    let locale = "en-US";

    // Try to get the current locale from i18n if available
    try {
        if (typeof useI18n === "function") {
            const { locale: currentLocale } = useI18n();
            locale = currentLocale.value || "en-US";
        }
    } catch {
        // Fallback to en-US if useI18n is not available (SSR)
        locale = "en-US";
    }

    const options: Intl.NumberFormatOptions = {
        style: "decimal",
        useGrouping: true,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0, // Change this to 0 to avoid decimal places for whole numbers
    };

    // Format the number
    return new Intl.NumberFormat(locale, options).format(value);
}
