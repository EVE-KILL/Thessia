interface IDogmaAttributes {
    attribute_id: Number;
    value: Number;
}

interface IDogmaEffects {
    effect_id: Number;
    is_default: Boolean;
}

interface ITypeID {
    type_id: Number;
    capacity: Number;
    description: String;
    group_id: Number;
    icon_id: Number;
    market_group_id: Number;
    mass: Number;
    name: String;
    packaged_volume: Number;
    portion_size: Number;
    published: Boolean;
    radius: Number;
    volume: Number;
    dogma_attributes: IDogmaAttributes[];
    dogma_effects: IDogmaEffects[];
    updatedAt?: Date;
    createdAt?: Date;
}

export type { ITypeID as TypeID };
