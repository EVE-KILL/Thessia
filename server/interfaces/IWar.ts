interface IAggressor {
  corporation_id?: number;
  alliance_id?: number;
  isk_destroyed: number;
  ships_killed: number;
}

interface IDefender {
  corporation_id?: number;
  alliance_id?: number;
  isk_destroyed: number;
  ships_killed: number;
}

interface IAllies {
  corporation_id?: number;
  alliance_id?: number;
}

export interface IWar {
  war_id: number;
  declared: Date;
  started: Date;
  finished?: Date;
  retracted?: Date;
  mutual: boolean;
  open_for_allies: boolean;
  aggressor: IAggressor;
  defender: IDefender;
  allies: IAllies[];
}
