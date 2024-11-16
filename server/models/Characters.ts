import { defineMongooseModel } from "#nuxt/mongoose";
import { Schema } from "mongoose";

export const Characters = defineMongooseModel({
  name: "characters",
  options: {
    collection: "characters",
    timestamps: true,
  },
  hooks(schema: Schema) {
    schema.index({ character_id: 1 }, { unique: true });
    schema.index({ name: 1 }, { sparse: true });
    schema.index({ corporation_id: 1 }, { sparse: true });
    schema.index({ alliance_id: 1 }, { sparse: true });
    schema.index({ faction_id: 1 }, { sparse: true });
    schema.index({ createdAt: 1 }, { sparse: true });
    schema.index({ updatedAt: 1 }, { sparse: true });
  },
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
    history: Array<Object>
  },
});
