interface IRegion {
    region_id: Number;
    region_name: String;
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
    nebula: Number;
    radius: Number;
}

export type { IRegion as Region };
