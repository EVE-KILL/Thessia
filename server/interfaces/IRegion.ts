import type { ITranslation } from "./ITranslation";

export interface IRegion {
  center: { x: number; y: number; z: number };
  description_id: number;
  faction_id: number;
  max: { x: number; y: number; z: number };
  min: { x: number; y: number; z: number };
  name_id: number;
  region_id: number;
  wormhole_class_id?: number;
  nebula_id?: number;
  universe_id: string;
  description: ITranslation;
  name: ITranslation;
  updatedAt?: Date;
  createdAt?: Date;
}
