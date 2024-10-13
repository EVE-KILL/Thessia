import { defineMongooseModel } from "#nuxt/mongoose";
import { Schema } from "mongoose";

export const Celestials = defineMongooseModel({
  name: "celestials",
  options: {
    collection: "celestials",
  },
  hooks(schema: Schema) {},
  schema: {
    item_id: Number,
    constellation_id: Number,
    item_name: String,
    last_modified: Date,
    orbit_id: Number,
    region_id: Number,
    region_name: String,
    solar_system_id: Number,
    solar_system_name: String,
    type_id: Number,
    type_name: String,
    x: Number,
    y: Number,
    z: Number,
  },
});
