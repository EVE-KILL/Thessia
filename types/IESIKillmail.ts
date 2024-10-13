interface IESIKillmail {
  killmail_id: Number;
  killmail_hash: String;
  killmail_time: Date;
  killmail_time_str: String;
  last_modified: Date;
  solar_system_id: Number;
  attackers: [
    {
      character_id: Number;
      corporation_id: Number;
      alliance_id: Number;
      damage_done: Number;
      final_blow: Boolean;
      security_status: Number;
      ship_type_id: Number;
      weapon_type_id: Number;
    }
  ];
  victim: {
    character_id: Number;
    corporation_id: Number;
    alliance_id: Number;
    damage_taken: Number;
    ship_type_id: Number;
    items: [
      {
        item_type_id: Number;
        quantity_destroyed: Number;
        quantity_dropped: Number;
        flag: Number;
        singleton: Number;
      }
    ];
  };
}

export type { IESIKillmail as Killmail };
