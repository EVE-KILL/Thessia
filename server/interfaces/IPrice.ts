export interface IPrice {
  date: Date;
  region_id: number;
  type_id: number;
  average: number;
  highest: number;
  lowest: number;
  order_count: number;
  volume: number;
  updatedAt?: Date;
  createdAt?: Date;
}
