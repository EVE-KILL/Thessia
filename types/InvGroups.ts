interface IInvGroups {
    group_id: Number;
    category_id: Number;
    group_name: String;
    icon_id: Number;
    use_base_price: Boolean;
    anchored: Boolean;
    anchorable: Boolean;
    fittable_non_singleton: Boolean;
    published: Boolean;
    updatedAt?: Date;
    createdAt?: Date;
}

export type { IInvGroups as InvGroups };
