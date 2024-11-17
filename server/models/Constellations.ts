import { defineMongooseModel } from "#nuxt/mongoose";
import { Schema } from "mongoose";

export const Constellations = defineMongooseModel({
  name: "constellations",
  options: {
    collection: "constellations",
    timestamps: true,
  },
  hooks(schema: Schema) {
    schema.index({ constellation_id: 1 }, { unique: true });
    schema.index({ region_id: 1 }, { sparse: true });
  },
  schema: {
    region_id: Number,
    constellation_id: Number,
    constellation_name: String,
    x: Number,
    y: Number,
    z: Number,
    x_min: Number,
    x_max: Number,
    y_min: Number,
    y_max: Number,
    z_min: Number,
    z_max: Number,
    faction_id: Number,
    radius: Number,
  },
});
