interface IPosition {
    x: Number;
    y: Number;
    z: Number;
}

interface IStation {
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
    position: IPosition;
    services: String[];
    updatedAt?: Date;
    createdAt?: Date;
}

export type { IStation as Station };
