interface ISolarSystem {
    region_id: Number;
    constellation_id: Number;
    system_id: Number;
    system_name: String;
    x: Number;
    y: Number;
    z: Number;
    x_min: Number;
    x_max: Number;
    y_min: Number;
    y_max: Number;
    z_min: Number;
    z_max: Number;
    luminosity: Number;
    border: Boolean;
    fringe: Boolean;
    corridor: Boolean;
    hub: Boolean;
    international: Boolean;
    regional: Boolean;
    constellation: Number;
    security: Number;
    faction_id: Number;
    radius: Number;
    sun_type_id: Number;
    security_class: String;
}

export type { ISolarSystem as SolarSystem };
