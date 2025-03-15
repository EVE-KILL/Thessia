import { type Document, type Model, Schema, model } from "mongoose";
import type { IInvType } from "../interfaces/IInvType"; // Adjust the path as necessary

export interface IInvTypeDocument extends IInvType, Document {}

const invTypesSchema = new Schema<IInvTypeDocument>(
  {
    type_id: { type: Number, unique: true },
    group_id: { type: Number },
    category_id: { type: Number },
    name: { type: Object, required: true },
    description: { type: Object, required: true },
    mass: { type: Number },
    volume: { type: Number },
    capacity: { type: Number },
    portion_size: { type: Number },
    packaged_volume: { type: Number },
    radius: { type: Number },
    race_id: { type: Number },
    faction_id: { type: Number },
    base_price: { type: Number },
    published: { type: Boolean },
    market_group_id: { type: Number },
    icon_id: { type: Number },
    sound_id: { type: Number },
    graphic_id: { type: Number },
    masteries: { type: Object },
    meta_group_id: { type: Number },
    sof_faction_name: { type: String },
    // New fields based on IInvType:
    traits: { type: Object },
    dogma_attributes: { type: Object },
    dogma_effects: { type: Object },
    type_materials: { type: Object },
    required_skills: { type: Object },
    type_variations: { type: Object },
    produced_by_blueprints: { type: Object },
    used_in_blueprints: { type: Object },
    engineering_rig_source_type_ids: { type: [Number] },
    variation_parent_type_id: { type: Number }, // new field added
    updatedAt: { type: Date },
    createdAt: { type: Date },
  },
  {
    collection: "invTypes",
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret._id;
        delete ret.__v;
      },
    },
  },
);

invTypesSchema.index({ group_id: 1 }, { sparse: true });

export const InvTypes: Model<IInvTypeDocument> = model<IInvTypeDocument>(
  "invTypes",
  invTypesSchema,
  "invTypes",
);
