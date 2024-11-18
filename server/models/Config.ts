import { defineMongooseModel } from "#nuxt/mongoose";
import { Schema } from "mongoose";

export const Config = defineMongooseModel({
  name: "config",
  options: {
    collection: "config",
    toJSON: {
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
      }
    },
  },
  hooks(schema: Schema) {
    schema.index({ key: 1 }, { unique: true});
  },
  schema: {
    key: String,
    value: String,
  },
});
