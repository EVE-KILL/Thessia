import { defineMongooseModel } from "#nuxt/mongoose";
import { Schema } from "mongoose";

export const Killmails = defineMongooseModel({
  name: "killmails",
  options: {
    collection: "killmails",
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
      }
    },
  },
  hooks(schema: Schema) {
    schema.index({ killmail_id: 1, hash: 1 }, { unique: true });
    schema.index({ kill_time: 1 }, { sparse: true });
    schema.index({ createdAt: 1 }, { sparse: true });
    schema.index({ updatedAt: 1 }, { sparse: true });
  },
  schema: {
    hash: String,
    killmail_id: Number,
    attackers: [
      {
        ship_id: Number,
        ship_name: String,
        ship_image_url: String,
        ship_group_id: Number,
        ship_group_name: String,
        character_id: Number,
        character_name: String,
        character_image_url: String,
        corporation_id: Number,
        corporation_name: String,
        corporation_image_url: String,
        alliance_id: Number,
        alliance_name: String,
        alliance_image_url: String,
        faction_id: Number,
        faction_name: String,
        faction_image_url: String,
        security_status: Number,
        damage_done: Number,
        final_blow: Boolean,
        weapon_type_id: Number,
        weapon_type_name: String,
        _id: false
      },
    ],
    dna: String,
    fitting_value: Number,
    is_npc: Boolean,
    is_solo: Boolean,
    items: [
      {
        type_id: Number,
        type_name: String,
        type_image_url: String,
        group_id: Number,
        group_name: String,
        category_id: Number,
        flag: Number,
        qty_dropped: Number,
        qty_destroyed: Number,
        singleton: Number,
        value: Number,
        _id: false
      },
    ],
    kill_time: Date,
    kill_time_str: String,
    near: String,
    point_value: Number,
    region_id: Number,
    region_name: String,
    ship_value: Number,
    system_id: Number,
    system_name: String,
    system_security: Number,
    total_value: Number,
    victim: {
      ship_id: Number,
      ship_name: String,
      ship_image_url: String,
      ship_group_id: Number,
      ship_group_name: String,
      damage_taken: Number,
      character_id: Number,
      character_name: String,
      character_image_url: String,
      corporation_id: Number,
      corporation_name: String,
      corporation_image_url: String,
      alliance_id: Number,
      alliance_name: String,
      alliance_image_url: String,
      faction_id: Number,
      faction_name: String,
      faction_image_url: String,
      _id: false
    },
    war_id: Number,
    x: Number,
    y: Number,
    z: Number,
    emitted: Boolean,
  },
});
