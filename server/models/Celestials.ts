import { defineMongooseModel } from "#nuxt/mongoose";
import { Schema } from "mongoose";

export const Celestials = defineMongooseModel({
  name: "celestials",
  options: {
    collection: "celestials",
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
      }
    },
  },
  hooks(schema: Schema) {
    schema.index({ item_id: 1 }, { unique: true});
    schema.index({ solar_system_id: 1 }, { sparse: true});
    schema.index({ region_id: 1 }, { sparse: true});
    schema.index({ x: 1, y: 1, z: 1 }, { name: "x_y_z" });
  },
  schema: {
    item_id: Number,
    constellation_id: Number,
    item_name: String,
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
