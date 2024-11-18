interface IAttacker {
  character_id: Number;
  corporation_id: Number;
  alliance_id: Number;
  faction_id?: Number;
  damage_done: Number;
  final_blow: Boolean;
  security_status: Number;
  ship_type_id: Number;
  weapon_type_id: Number;
}

interface IVictimItem {
  item_type_id: Number;
  quantity_destroyed: Number;
  quantity_dropped: Number;
  flag: Number;
  singleton: Number;
  items?: IVictimItem[];
}

interface IVictim {
  character_id: Number;
  corporation_id: Number;
  alliance_id: Number;
  faction_id: Number;
  damage_taken: Number;
  ship_type_id: Number;
  items: IVictimItem[];
  position: {
    x: Number;
    y: Number;
    z: Number;
  };
}

interface IESIKillmail {
  killmail_id: Number;
  killmail_hash: String;
  killmail_time: Date;
  killmail_time_str: String;
  solar_system_id: Number;
  attackers: IAttacker[];
  victim: IVictim;
  updatedAt?: Date;
  createdAt?: Date;
  error?: String;
}

export type { IESIKillmail as ESIKillmail };
export type { IAttacker as ESIAttacker };
export type { IVictim as ESIVictim };
export type { IVictimItem as ESIVictimItem };
