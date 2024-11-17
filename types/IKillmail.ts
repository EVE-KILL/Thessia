interface IAttacker {
  ship_id: Number;
  ship_name: String;
  ship_group_id: Number;
  ship_group_name: String;
  character_id: Number;
  character_name: String;
  corporation_id: Number;
  corporation_name: String;
  alliance_id: Number;
  alliance_name: String;
  faction_id: Number;
  faction_name: String;
  security_status: Number;
  damage_done: Number;
  final_blow: Boolean;
  weapon_type_id: Number;
  weapon_type_name: String;
}

interface IItem {
  type_id: Number;
  type_name: String;
  group_id: Number;
  group_name: String;
  category_id: Number;
  flag: Number;
  qty_dropped: Number;
  qty_destroyed: Number;
  singleton: Number;
  value: Number;
  items?: IItem[];
}

interface IVictim {
  ship_id: Number;
  ship_name: String;
  ship_group_id: Number;
  ship_group_name: String;
  damage_taken: Number;
  character_id: Number;
  character_name: String;
  corporation_id: Number;
  corporation_name: String;
  alliance_id: Number;
  alliance_name: String;
  faction_id: Number;
  faction_name: String;
}

interface IKillmail {
  killmail_hash: String;
  killmail_id: Number;
  attackers: IAttacker[];
  fitting_value: Number;
  is_npc: Boolean;
  is_solo: Boolean;
  items: IItem[];
  kill_time: Date;
  near: String;
  region_id: Number;
  region_name: String;
  ship_value: Number;
  system_id: Number;
  system_name: String;
  system_security: Number;
  total_value: Number;
  victim: IVictim;
  war_id: Number;
  x: Number;
  y: Number;
  z: Number;
  emitted?: Boolean;
  updatedAt?: Date;
  createdAt?: Date;
}

export type { IKillmail as Killmail };
export type { IAttacker as Attacker };
export type { IItem as Item };
export type { IVictim as Victim };
