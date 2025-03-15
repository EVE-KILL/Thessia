export interface IFaction {
  faction_id: number;
  corporation_id: number;
  description: string;
  militia_corporation_id: number;
  name: string;
  size_factor: number;
  solar_system_id: number;
  station_count: number;
  station_system_count: number;
  icon_id: number;
  race_ids: number;
  ceo_id: number;
  creator_id: number;
  home_station_id: number;
  updatedAt?: Date;
  createdAt?: Date;
}
