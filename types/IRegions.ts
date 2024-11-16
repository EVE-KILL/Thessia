interface IRegions {
    region_id: Number;
    constellations: Number[];
    description: String;
    name: String;
    updatedAt?: Date;
    createdAt?: Date;
}

export type { IRegions as Regions };
