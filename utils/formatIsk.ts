export default function formatIsk(value: number): string {
    if (!value || typeof value !== 'number') return '0 ISK';

    if (value >= 1000000000) {
        return `${(value / 1000000000).toFixed(2)} B`;
    } else if (value >= 1000000) {
        return `${(value / 1000000).toFixed(2)} M`;
    } else if (value >= 1000) {
        return `${(value / 1000).toFixed(2)} K`;
    }

    return `${value.toFixed(2)} ISK`;
}
