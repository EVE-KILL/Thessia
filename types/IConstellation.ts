interface IConstellation {
    region_id: Number;
    constellation_id: Number;
    constellation_name: String;
    x: Number;
    y: Number;
    z: Number;
    x_min: Number;
    x_max: Number;
    y_min: Number;
    y_max: Number;
    z_min: Number;
    z_max: Number;
    faction_id: Number;
    radius: Number;
}

export type { IConstellation as Constellation };
