import { Schema, model, type Document, type Model } from "mongoose";
import type { IWar } from "../interfaces/IWar";

export interface IWarDocument extends IWar, Document {}

const warsSchema = new Schema<IWarDocument>(
  {
    war_id: { type: Number, unique: true, required: true },
    declared: { type: Date, required: true },
    started: { type: Date, required: true },
    finished: { type: Date },
    retracted: { type: Date },
    mutual: { type: Boolean, required: true },
    open_for_allies: { type: Boolean, required: true },
    aggressor: {
      corporation_id: { type: Number, sparse: true },
      alliance_id: { type: Number, sparse: true },
      isk_destroyed: { type: Number, required: true },
      ships_killed: { type: Number, required: true },
    },
    defender: {
      corporation_id: { type: Number, sparse: true },
      alliance_id: { type: Number, sparse: true },
      isk_destroyed: { type: Number, required: true },
      ships_killed: { type: Number, required: true },
    },
    allies: [
      {
        corporation_id: { type: Number, sparse: true },
        alliance_id: { type: Number, sparse: true },
      },
    ],
  },
  {
    collection: "wars",
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret._id;
        delete ret.__v;
      },
    },
  },
);

export const Wars: Model<IWarDocument> = model<IWarDocument>("wars", warsSchema, "wars");
