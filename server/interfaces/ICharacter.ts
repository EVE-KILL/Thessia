export interface ICharacterHistory {
  record_id: number;
  corporation_id: number;
  start_date: Date;
}

// Interface for a Character
export interface ICharacter {
  character_id: number;
  name: string;
  description: string;
  birthday: Date;
  gender: string;
  race_id: number;
  security_status: number;
  bloodline_id: number;
  corporation_id: number;
  alliance_id: number;
  faction_id: number;
  history: ICharacterHistory[];
  deleted?: boolean;
  last_active?: Date;
  updatedAt?: Date;
  createdAt?: Date;
  error?: string;
}
