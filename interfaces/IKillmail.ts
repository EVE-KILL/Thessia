import type { IAttacker } from './IAttacker';
import type { IVictim } from './IVictim';

export interface IKillmail {
  killmail_id: number;
  total_value: number;
  system_id: number;
  system_name: string;
  system_security: number;
  region_id: number;
  region_name: Record<string, string>;
  kill_time: string;
  attackers: IAttacker[];
  victim: IVictim;
  is_npc: boolean;
  is_solo: boolean;
}
