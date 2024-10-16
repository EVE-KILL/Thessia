import { defineMongooseModel } from "#nuxt/mongoose";
import { Schema } from "mongoose";

export const Characters = defineMongooseModel({
  name: "characters",
  options: {
    collection: "characters",
  },
  hooks(schema: Schema) {},
  schema: {
    character_id: Number,
    name: String,
    description: String,
    birthday: Date,
    gender: String,
    race_id: Number,
    security_status: Number,
    bloodline_id: Number,
    corporation_id: Number,
    alliance_id: Number,
    faction_id: Number,
    last_modified: Date,
  },
});
