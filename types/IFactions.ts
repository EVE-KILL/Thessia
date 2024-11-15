interface IFactions {
    faction_id: Number;
    corporation_id: Number;
    description: String;
    militia_corporation_id: Number;
    name: String;
    size_factor: Number;
    solar_system_id: Number;
    station_count: Number;
    station_system_count: Number;
    icon_id: Number;
    race_ids: Number;
    ceo_id: Number;
    creator_id: Number;
    home_station_id: Number;
    last_modified: Date;
}

export type { IFactions as Factions };
