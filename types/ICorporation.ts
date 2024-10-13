interface ICorporation {
  corporation_id: Number;
  name: String;
  ticker: String;
  description: String;
  date_founded: Date;
  alliance_id: Number;
  faction_id: Number;
  faction_name: String;
  ceo_id: Number;
  creator_id: Number;
  home_station_id: Number;
  home_station_name: String;
  member_count: Number;
  shares: Number;
  tax_rate: Number;
  url: String;
  history: [
    {
      record_id: Number;
      alliance_id: Number;
      start_date: Date;
    },
  ];
  last_modified: Date;
}

export type { ICorporation as Corporation };
