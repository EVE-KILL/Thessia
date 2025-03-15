interface IFullStats {
  kills: number;
  losses: number;
  iskKilled: number;
  iskLost: number;
  npcLosses: number;
  soloKills: number;
  soloLosses: number;
  lastActive: Date;
  mostUsedShips: Record<number, { count: number; name: string }>;
  mostLostShips: Record<number, { count: number; name: string }>;
  diesToCorporations: Record<number, { count: number; name: string }>;
  diesToAlliances: Record<number, { count: number; name: string }>;
  blobFactor: number;
  heatMap: Record<string, number>;
  fliesWithCorporations: Record<
    number,
    {
      count: number;
      name: string;
      killmails: number[];
    }
  >;
  fliesWithAlliances: Record<
    number,
    {
      count: number;
      name: string;
      killmails: number[];
    }
  >;
  sameShipAsOtherAttackers: Record<number, boolean>;
  whoreKills: number;
  possibleFC: boolean;
  possibleCynoAlt: boolean;
}
