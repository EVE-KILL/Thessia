export interface IComments {
  identifier: string; // Unique identifier for each comment
  killIdentifier: string; // Non-unique identifier for the kill (e.g., kill:12345)
  comment: string;
  characterId: number;
  characterName: string;
  corporationId: number;
  corporationName: string;
  allianceId?: number;
  allianceName?: string;
  createdAt?: Date;
  updatedAt?: Date;

  // New fields for deletion and reporting
  deleted?: boolean;
  reported?: boolean;
  reportMessages?: Array<{
    reporterId: number;
    reporterName: string;
    message: string;
    timestamp?: Date;
  }>;
}
