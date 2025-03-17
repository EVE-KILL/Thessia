/**
 * Interface representing EVE SSO token response
 */
export interface IEveSSOTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token: string;
  scope?: string;
}

/**
 * Interface representing EVE SSO verification response
 */
export interface IEveSSOVerifyResponse {
  CharacterID: number;
  CharacterName: string;
  ExpiresOn: string;
  Scopes: string;
  TokenType: string;
  CharacterOwnerHash: string;
  IntellectualProperty: string;
}
