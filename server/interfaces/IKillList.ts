export interface IKillList {
  killmail_id: number;
  total_value: number;
  system_id: number;
  system_name: string;
  system_security: number;
  region_id: number;
  region_name: string;
  kill_time: string;
  attackerCount: number;
  commentCount: number;
  is_npc: boolean;
  is_solo: boolean;

  victim: {
    ship_id: number;
    ship_name: string;
    character_id: number;
    character_name: string;
    corporation_id: number;
    corporation_name: string;
    alliance_id: number;
    alliance_name: string;
    faction_id: number;
    faction_name: string;
  };

  finalblow: {
    character_id: number;
    character_name: string;
    corporation_id: number;
    corporation_name: string;
    alliance_id: number;
    alliance_name: string;
    faction_id: number;
    faction_name: string;
    ship_group_name: string;
    is_npc: boolean;
  };
}
