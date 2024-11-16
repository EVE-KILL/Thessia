interface IPlanets {
    planet_id: Number;
}

interface IPosition {
    x: Number;
    y: Number;
    z: Number;
}

interface ISolarSystems {
    system_id: Number;
    constellation_id: Number;
    constelaltion_name: String;
    name: String;
    region_id: Number;
    region_name: String;
    security_class: String;
    security_status: Number;
    star_id: Number;
    planets: IPlanets[];
    position: IPosition;
    stargates: Number[];
    updatedAt?: Date;
    createdAt?: Date;
}

export type { ISolarSystems as SolarSystems };
