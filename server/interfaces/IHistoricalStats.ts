export interface IHistoricalStats {
  alliance_id: number;
  corporation_id: number;
  count: number;
  previousCount?: number;
  date: Date;
  historicalCounts: Array<{
    count: number;
    date: Date;
  }>;
  updatedAt?: Date;
  createdAt?: Date;
}
