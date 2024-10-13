import { defineMongooseModel } from "#nuxt/mongoose";
import { Schema } from "mongoose";

export const Alliances = defineMongooseModel({
  name: "alliances",
  options: {
    collection: "alliances",
  },
  hooks(schema: Schema) {},
  schema: {
    alliance_id: Number,
    name: String,
    ticker: String,
    creator_id: Number,
    creator_corporation_id: Number,
    executor_corporation_id: Number,
    last_modified: Date,
  },
});

