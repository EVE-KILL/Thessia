import { defineMongooseModel } from "#nuxt/mongoose";
import { Schema } from "mongoose";

export const InvFlags = defineMongooseModel({
  name: "invflags",
  options: {
    collection: "invFlags",
    timestamps: true,
  },
  hooks(schema: Schema) {
    schema.index({ flag_id: 1 }, { unique: true });
  },
  schema: {
    flag_id: Number,
    flag_name: String,
    flag_text: String,
    order_id: Number,
  },
});
