import { Schema, model, type Document, type Model } from "mongoose";
import type { ISolarSystem } from "../interfaces/ISolarSystem"; // Adjust the path as necessary

export interface ISolarSystemDocument extends ISolarSystem, Document {}

const solarSystemsSchema = new Schema<ISolarSystemDocument>(
  {
    region_id: { type: Number },
    constellation_id: { type: Number },
    system_id: { type: Number, unique: true },
    system_name: { type: String },
    x: { type: Number },
    y: { type: Number },
    z: { type: Number },
    x_min: { type: Number },
    x_max: { type: Number },
    y_min: { type: Number },
    y_max: { type: Number },
    z_min: { type: Number },
    z_max: { type: Number },
    luminosity: { type: Number },
    border: { type: Boolean },
    fringe: { type: Boolean },
    corridor: { type: Boolean },
    hub: { type: Boolean },
    international: { type: Boolean },
    regional: { type: Boolean },
    constellation: { type: Number },
    security: { type: Number },
    faction_id: { type: Number },
    radius: { type: Number },
    sun_type_id: { type: Number },
    security_class: { type: String },
    updatedAt: { type: Date },
    createdAt: { type: Date },
  },
  {
    collection: "solarSystems",
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret._id;
        delete ret.__v;
      },
    },
  },
);

// Define indexes for the schema
solarSystemsSchema.index({ constellation_id: 1 }, { sparse: true });
solarSystemsSchema.index({ region_id: 1 }, { sparse: true });

export const SolarSystems: Model<ISolarSystemDocument> = model<ISolarSystemDocument>(
  "solarsystems",
  solarSystemsSchema,
  "solarSystems", // Explicitly specifying the collection name
);
