import { defineMongooseModel } from "#nuxt/mongoose";
import { Schema } from "mongoose";

export const Alliances = defineMongooseModel({
  name: "alliances",
  options: {
    collection: "alliances",
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
      }
    },
  },
  hooks(schema: Schema) {
    schema.index({ alliance_id: 1 }, { unique: true });
    schema.index({ name: 1 }, { sparse: true });
    schema.index({ ticker: 1 }, { sparse: true });
    schema.index({ creator_id: 1 }, { sparse: true });
    schema.index({ creator_corporation_id: 1 }, { sparse: true });
    schema.index({ executor_corporation_id: 1 }, { sparse: true });
    schema.index({ createdAt: 1 }, { sparse: true });
    schema.index({ updatedAt: 1 }, { sparse: true });
  },
  schema: {
    alliance_id: Number,
    name: String,
    ticker: String,
    creator_id: Number,
    creator_corporation_id: Number,
    executor_corporation_id: Number,
  },
});
