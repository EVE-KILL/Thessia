import { Schema, model, type Document, type Model } from "mongoose";
import type { IUser } from "../interfaces/IUser";

export interface IUserDocument extends IUser, Document {}

const userSchema = new Schema<IUserDocument>(
  {
    accessToken: { type: String, required: true },
    dateExpiration: { type: Date, required: true },
    refreshToken: { type: String, required: true },
    characterId: { type: Number, required: true },
    characterName: { type: String, required: true },
    scopes: { type: [String], required: true },
    tokenType: { type: String, required: true },
    characterOwnerHash: { type: String, required: true },
    uniqueIdentifier: { type: String, required: true },
    lastChecked: { type: Date, default: Date.now },
    canFetchCorporationKillmails: { type: Boolean, default: true },
  },
  {
    collection: "users",
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret._id;
        delete ret.__v;
      },
    },
  },
);

// Primary indexes
userSchema.index({ characterId: 1 }, { unique: true });

export const Users: Model<IUserDocument> = model<IUserDocument>("users", userSchema, "users");
