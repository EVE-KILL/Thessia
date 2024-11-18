import { defineMongooseModel } from "#nuxt/mongoose";
import { Schema } from "mongoose";

export const InvFlags = defineMongooseModel({
  name: "invflags",
  options: {
    collection: "invFlags",
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
      }
    },
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
