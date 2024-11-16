interface IGroupID {
    group_id: Number;
    category_id: Number;
    name: String;
    published: Boolean;
    types: Number[];
    updatedAt?: Date;
    createdAt?: Date;
}

export type { IGroupID as GroupID };
