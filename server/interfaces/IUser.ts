import type { IUserSetting } from "./IUserSettings";

/**
 * Interface representing a user authenticated with EVE SSO
 */
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
    esiActive: boolean; // Whether ESI fetching is active for this user
    administrator: boolean;
    settings: IUserSetting[]; // Array of user settings
    createdAt?: Date;
    updatedAt?: Date;
}
