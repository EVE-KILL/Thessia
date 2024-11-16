interface ICharacterHistory {
  record_id: Number;
  corporation_id: Number;
  start_date: Date;
}

interface ICharacter {
  character_id: Number;
  name: String;
  description: String;
  birthday: Date;
  gender: String;
  race_id: Number;
  security_status: Number;
  bloodline_id: Number;
  corporation_id: Number;
  alliance_id: Number;
  faction_id: Number;
  history: ICharacterHistory[];
  deleted?: Boolean;
  updatedAt?: Date;
  createdAt?: Date;
}

export type { ICharacter as Character };
export type { ICharacterHistory as CharacterHistory };
