// Format numbers according to the user's locale and preferences (With fallback to da-DK)
export function numberFormat(value: number): string {
    if (typeof value !== "number" || isNaN(value)) {
        return "0";
    }

    // Use user's locale or fallback to 'da-DK'
    // Handle both browser and server environments
    const locale =
        (typeof navigator !== "undefined" && navigator.language) || "da-DK";
    const options: Intl.NumberFormatOptions = {
        style: "decimal",
        useGrouping: true,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    };

    // Format the number
    return new Intl.NumberFormat(locale, options).format(value);
}
