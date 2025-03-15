export interface ICorporationHistory {
  record_id: number;
  alliance_id: number;
  start_date: Date;
}

export interface ICorporation {
  corporation_id: number;
  name: string;
  ticker: string;
  description: string;
  date_founded: Date;
  alliance_id: number;
  faction_id: number;
  faction_name: string;
  ceo_id: number;
  creator_id: number;
  home_station_id: number;
  home_station_name: string;
  member_count: number;
  shares: number;
  tax_rate: number;
  url: string;
  history: ICorporationHistory[];
  deleted?: boolean;
  updatedAt?: Date;
  createdAt?: Date;
  error?: string;
}
