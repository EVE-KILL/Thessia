export interface IAttacker {
  character_id: number;
  character_name: string;
  corporation_id: number;
  corporation_name: string;
  alliance_id?: number;
  alliance_name?: string;
  faction_id?: number;
  faction_name?: string;
  ship_group_name: Record<string, string>;
  final_blow: boolean;
}
