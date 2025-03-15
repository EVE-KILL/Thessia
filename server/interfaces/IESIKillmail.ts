export interface IESIAttacker {
  character_id: number;
  corporation_id: number;
  alliance_id: number;
  faction_id?: number;
  damage_done: number;
  final_blow: boolean;
  security_status: number;
  ship_type_id: number;
  weapon_type_id: number;
}

// Interface for items associated with a victim
export interface IESIVictimItem {
  item_type_id: number;
  quantity_destroyed: number;
  quantity_dropped: number;
  flag: number;
  singleton: number;
  items?: IESIVictimItem[];
}

// Interface for a victim
export interface IESIVictim {
  character_id: number;
  corporation_id: number;
  alliance_id: number;
  faction_id: number;
  damage_taken: number;
  ship_type_id: number;
  items: IESIVictimItem[];
  position: {
    x: number;
    y: number;
    z: number;
  };
}

// Interface for a Killmail
export interface IESIKillmail {
  killmail_id: number;
  killmail_hash: string;
  killmail_time: Date;
  solar_system_id: number;
  attackers: IESIAttacker[];
  victim: IESIVictim;
  updatedAt?: Date;
  createdAt?: Date;
  error?: string;
  processed?: boolean;
}
