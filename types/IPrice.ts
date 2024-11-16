interface IPrice {
    date: Date;
    region_id: Number;
    type_id: Number;
    average: Number;
    highest: Number;
    lowest: Number;
    order_count: Number;
    volume: Number;
    updatedAt?: Date;
    createdAt?: Date;
}

export type { IPrice as Price };
