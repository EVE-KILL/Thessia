interface IPosition {
    x: Number;
    y: Number;
    z: Number;
};

interface IConstellation {
    constellation_id: Number;
    name: String;
    position: IPosition;
    region_id: Number;
    region_name: String;
    systems: Number[];
    updatedAt?: Date;
    createdAt?: Date;
}

export type { IPosition as Position };
export type { IConstellation as Constellation };
