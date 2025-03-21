export interface IVictim {
  ship_id: number;
  ship_name: Record<string, string>;
  character_id: number;
  character_name: string;
  corporation_id: number;
  corporation_name: string;
  alliance_id?: number;
  alliance_name?: string;
  faction_id?: number;
  faction_name?: string;
}
