import { defineMongooseModel } from "#nuxt/mongoose";
import { Schema } from "mongoose";

export const Corporations = defineMongooseModel({
  name: "corporations",
  options: {
    collection: "corporations",
    timestamps: true,
  },
  hooks(schema: Schema) {
    schema.index({ corporation_id: 1 }, { unique: true });
    schema.index({ name: 1 }, { sparse: true });
    schema.index({ ticker: 1 }, { sparse: true });
    schema.index({ alliance_id: 1 }, { sparse: true });
    schema.index({ faction_id: 1 }, { sparse: true });
    schema.index({ createdAt: 1 }, { sparse: true });
    schema.index({ updatedAt: 1 }, { sparse: true });
  },
  schema: {
    corporation_id: Number,
    name: String,
    ticker: String,
    description: String,
    date_founded: Date,
    alliance_id: Number,
    faction_id: Number,
    faction_name: String,
    ceo_id: Number,
    creator_id: Number,
    home_station_id: Number,
    home_station_name: String,
    member_count: Number,
    shares: Number,
    tax_rate: Number,
    url: String,
    history: [
      {
        record_id: Number,
        alliance_id: Number,
        start_date: Date,
      },
    ],
  },
});
