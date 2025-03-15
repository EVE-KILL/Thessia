import type { ITranslation } from "./ITranslation";

export interface IAttacker {
  ship_id: number;
  ship_name: ITranslation;
  ship_group_id: number;
  ship_group_name: ITranslation;
  character_id: number;
  character_name: string;
  corporation_id: number;
  corporation_name: string;
  alliance_id: number;
  alliance_name: string;
  faction_id: number;
  faction_name: string;
  security_status: number;
  damage_done: number;
  final_blow: boolean;
  weapon_type_id: number;
  weapon_type_name: ITranslation;
}

export interface IItem {
  type_id: number;
  name: ITranslation;
  group_id: number;
  group_name: ITranslation;
  category_id: number;
  flag: number;
  qty_dropped: number;
  qty_destroyed: number;
  singleton: number;
  value: number;
  items?: IItem[];
}

export interface IVictim {
  ship_id: number;
  ship_name: ITranslation;
  ship_group_id: number;
  ship_group_name: ITranslation;
  damage_taken: number;
  character_id: number;
  character_name: string;
  corporation_id: number;
  corporation_name: string;
  alliance_id: number;
  alliance_name: string;
  faction_id: number;
  faction_name: string;
}

export interface IKillmail {
  killmail_hash: string;
  killmail_id: number;
  attackers: IAttacker[];
  dna: string;
  fitting_value: number;
  is_npc: boolean;
  is_solo: boolean;
  items: IItem[];
  kill_time: Date;
  kill_time_str: string;
  near: string;
  region_id: number;
  region_name: ITranslation;
  ship_value: number;
  system_id: number;
  system_name: string;
  system_security: number;
  constellation_id: number;
  constellation_name: string;
  total_value: number;
  victim: IVictim;
  war_id: number;
  x: number;
  y: number;
  z: number;
  updatedAt?: Date;
  createdAt?: Date;
}
