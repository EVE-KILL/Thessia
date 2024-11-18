import { defineMongooseModel } from "#nuxt/mongoose";
import { Schema } from "mongoose";

export const Regions = defineMongooseModel({
  name: "regions",
  options: {
    collection: "regions",
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
      }
    },
  },
  hooks(schema: Schema) {
    schema.index({ region_id: 1 }, { unique: true });
  },
  schema: {
    region_id: Number,
    region_name: String,
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
    nebula: Number,
    radius: Number,
  },
});
