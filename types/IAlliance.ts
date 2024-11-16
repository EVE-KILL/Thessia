interface IAlliance {
  alliance_id: Number;
  name: String;
  ticker: String;
  creator_id: Number;
  creator_corporation_id: Number;
  executor_corporation_id: Number;
  updatedAt?: Date;
  createdAt?: Date;
}

export type { IAlliance as Alliance };
