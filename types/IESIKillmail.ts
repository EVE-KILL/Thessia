interface IAttackers {
  character_id: Number;
  corporation_id: Number;
  alliance_id: Number;
  damage_done: Number;
  final_blow: Boolean;
  security_status: Number;
  ship_type_id: Number;
  weapon_type_id: Number;
}

interface IVictimItems {
  item_type_id: Number;
  quantity_destroyed: Number;
  quantity_dropped: Number;
  flag: Number;
  singleton: Number;
}

interface IVictim {
  character_id: Number;
  corporation_id: Number;
  alliance_id: Number;
  faction_id: Number;
  damage_taken: Number;
  ship_type_id: Number;
  items: IVictimItems[];
}

interface IESIKillmail {
  killmail_id: Number;
  killmail_hash: String;
  killmail_time: Date;
  killmail_time_str: String;
  solar_system_id: Number;
  attackers: IAttackers[];
  victim: IVictim;
  updatedAt?: Date;
  createdAt?: Date;
}

export type { IESIKillmail as ESIKillmail };
export type { IAttackers as ESIAttackers };
export type { IVictim as ESIVictim };
export type { IVictimItems as ESIVictimItems };
