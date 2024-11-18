import { defineMongooseModel } from "#nuxt/mongoose";
import { Schema } from "mongoose";

export const InvTypes = defineMongooseModel({
  name: "invTypes",
  options: {
    collection: "invTypes",
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
      }
    },
  },
  hooks(schema: Schema) {
    schema.index({ type_id: 1 }, { unique: true});
    schema.index({ group_id: 1 }, { sparse: true});
  },
  schema: {
    type_id: Number,
    group_id: Number,
    type_name: String,
    description: String,
    mass: Number,
    volume: Number,
    capacity: Number,
    portion_size: Number,
    race_id: Number,
    base_price: Number,
    published: Boolean,
    market_group_id: Number,
    icon_id: Number,
    sound_id: Number,
    graphic_id: Number,
  },
});
