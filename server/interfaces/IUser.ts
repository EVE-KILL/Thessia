export interface IUser {
  accessToken: string;
  dateExpiration: Date;
  refreshToken: string;
  characterId: number;
  characterName: string;
  scopes: string[];
  tokenType: string;
  characterOwnerHash: string;
  uniqueIdentifier: string;
  lastChecked: Date;
  canFetchCorporationKillmails: boolean;
}
