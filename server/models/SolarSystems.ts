import { defineMongooseModel } from "#nuxt/mongoose";
import { Schema } from "mongoose";

export const SolarSystems = defineMongooseModel({
  name: "solarsystems",
  options: {
    collection: "solarSystems",
    timestamps: true,
  },
  hooks(schema: Schema) {
    schema.index({ system_id: 1 }, { unique: true });
    schema.index({ constellation_id: 1 }, { sparse: true });
    schema.index({ region_id: 1 }, { sparse: true });
  },
  schema: {
    region_id: Number,
    constellation_id: Number,
    system_id: Number,
    system_name: String,
    x: Number,
    y: Number,
    z: Number,
    x_min: Number,
    x_max: Number,
    y_min: Number,
    y_max: Number,
    z_min: Number,
    z_max: Number,
    luminosity: Number,
    border: Boolean,
    fringe: Boolean,
    corridor: Boolean,
    hub: Boolean,
    international: Boolean,
    regional: Boolean,
    constellation: Number,
    security: Number,
    faction_id: Number,
    radius: Number,
    sun_type_id: Number,
    security_class: String,
  },
});
