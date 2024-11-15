import { defineMongooseModel } from "#nuxt/mongoose";
import { Schema } from "mongoose";

export const Prices = defineMongooseModel({
  name: "prices",
  options: {
    collection: "prices",
    timestamps: true,
  },
  hooks(schema: Schema) {
    schema.index({ type_id: 1, region_id: 1, date: 1 }, { unique: true });
    schema.index({ region_id: 1 }, { sparse: true });
    schema.index({ date: 1 }, { sparse: true });
  },
  schema: {
    type_id: Number,
    average: Number,
    highest: Number,
    lowest: Number,
    region_id: Number,
    order_count: Number,
    volume: Number,
    date: Date,
  },
});
