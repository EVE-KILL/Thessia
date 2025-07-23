// Server-side number formatting utility (compatible with Node.js)
export function numberFormat(value: number, locale: string = "da-DK"): string {
    if (typeof value !== "number" || isNaN(value)) {
        return "0";
    }

    const options: Intl.NumberFormatOptions = {
        style: "decimal",
        useGrouping: true,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    };

    // Format the number using the provided locale
    return new Intl.NumberFormat(locale, options).format(value);
}
