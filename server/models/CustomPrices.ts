import { defineMongooseModel } from "#nuxt/mongoose";
import { Schema } from "mongoose";

export const CustomPrices = defineMongooseModel({
  name: "customprices",
  options: {
    collection: "customPrices",
    timestamps: true,
  },
  hooks(schema: Schema) {
    schema.index({ type_id: 1, date: 1 }, { unique: true });
  },
  schema: {
    type_id: Number,
    price: Number,
    date: Date,
  },
});
