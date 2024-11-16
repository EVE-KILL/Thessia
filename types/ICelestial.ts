interface ICelestial {
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
  updatedAt?: Date;
  createdAt?: Date;
}

export type { ICelestial as Celestial };
