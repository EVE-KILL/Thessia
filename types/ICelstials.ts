interface ICelestials {
    item_id: Number;
    constellation_id: Number;
    item_name: String;
    orbit_id: Number;
    region_id: Number;
    region_name: String;
    solar_system_id: Number;
    solar_system_name: String;
    type_id: Number;
    type_name: String;
    x: Number;
    y: Number;
    z: Number;
    last_modified: Date;
};

export type { ICelestials as Celestials };