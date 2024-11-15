interface IPosition {
    x: Number;
    y: Number;
    z: Number;
};

interface IConstellations {
    constellation_id: Number;
    name: String;
    position: IPosition;
    region_id: Number;
    region_name: String;
    systems: Number[];
    last_modified: Date;
}

export type { IPosition as Position };
export type { ISystems as Systems };
export type { IConstellations as Constellations };
