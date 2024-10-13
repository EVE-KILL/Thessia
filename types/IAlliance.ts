interface IAlliance {
  alliance_id: Number;
  name: String;
  ticker: String;
  creator_id: Number;
  creator_corporation_id: Number;
  executor_corporation_id: Number;
  last_modified: Date; // Unixtime
}

export type { IAlliance as Alliance };
