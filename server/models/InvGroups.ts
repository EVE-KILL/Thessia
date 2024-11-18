import { defineMongooseModel } from "#nuxt/mongoose";
import { Schema } from "mongoose";

export const InvGroups = defineMongooseModel({
  name: "invgroups",
  options: {
    collection: "invGroups",
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
      }
    },
  },
  hooks(schema: Schema) {
    schema.index({ group_id: 1 }, { unique: true });
  },
  schema: {
    group_id: Number,
    category_id: Number,
    group_name: String,
    icon_id: Number,
    use_base_price: Boolean,
    anchored: Boolean,
    anchorable: Boolean,
    fittable_non_singleton: Number,
    published: Boolean,
  },
});
