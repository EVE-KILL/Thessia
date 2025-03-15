import { type Document, type Model, Schema, model } from "mongoose";
import type { IRegion } from "../interfaces/IRegion"; // Adjust the path as necessary

export interface IRegionDocument extends IRegion, Document {}

const regionsSchema = new Schema<IRegionDocument>(
  {
    center: { type: Object, required: true },
    description_id: { type: Number },
    faction_id: { type: Number },
    max: { type: Object, required: true },
    min: { type: Object, required: true },
    name_id: { type: Number },
    region_id: { type: Number, unique: true },
    wormhole_class_id: { type: Number },
    nebula_id: { type: Number },
    universe_id: { type: String, required: true },
    description: { type: Object, required: true },
    name: { type: Object, required: true },
    updatedAt: { type: Date },
    createdAt: { type: Date },
  },
  {
    collection: "regions",
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret._id;
        delete ret.__v;
      },
    },
  },
);

export const Regions: Model<IRegionDocument> = model<IRegionDocument>(
  "regions",
  regionsSchema,
  "regions",
);
