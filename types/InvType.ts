interface IInvType {
    type_id: Number;
    group_id: Number;
    type_name: String;
    description: String;
    mass: Number;
    volume: Number;
    capacity: Number;
    portion_size: Number;
    race_id: Number;
    base_price: Number;
    published: Boolean;
    market_group_id: Number;
    icon_id: Number;
    sound_id: Number;
    graphic_id: Number;
    updatedAt?: Date;
    createdAt?: Date;
}

export type { IInvType as InvType };
