interface IPositions {
    x: Number;
    y: Number;
    z: Number;
}

interface IStations {
    station_id: Number;
    max_dockable_ship_volume: Number;
    name: String;
    office_rental_cost: Number;
    owner: Number;
    race_id: Number;
    reprocessing_efficiency: Number;
    reprocessing_stations_take: Number;
    system_id: Number;
    type_id: Number;
    position: IPositions;
    services: String[];
    updatedAt?: Date;
    createdAt?: Date;
}

export type { IStations as Stations };
