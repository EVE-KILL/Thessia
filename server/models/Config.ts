import { defineMongooseModel } from "#nuxt/mongoose";
import { Schema } from "mongoose";

export const Config = defineMongooseModel({
  name: "config",
  options: {
    collection: "config",
  },
  hooks(schema: Schema) {
    schema.index({ key: 1 }, { unique: true});
  },
  schema: {
    key: String,
    value: String,
  },
});
