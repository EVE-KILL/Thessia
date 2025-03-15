export interface ICelestial {
  item_id: number;
  constellation_id: number;
  item_name: string;
  orbit_id: number;
  region_id: number;
  region_name: string;
  solar_system_id: number;
  solar_system_name: string;
  type_id: number;
  type_name: string;
  x: number;
  y: number;
  z: number;
  updatedAt?: Date;
  createdAt?: Date;
}
