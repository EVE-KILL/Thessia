interface IPrices {
    date: Date;
    region_id: Number;
    type_id: Number;
    average: Number;
    highest: Number;
    lowest: Number;
    order_count: Number;
    volume: Number;
}

export type { IPrices as Prices };