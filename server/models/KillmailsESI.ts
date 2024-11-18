import { defineMongooseModel } from "#nuxt/mongoose";
import { Schema } from "mongoose";

export const KillmailsESI = defineMongooseModel({
  name: "killmails_esi",
  options: {
    collection: "killmails_esi",
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
      }
    },
  },
  hooks(schema: Schema) {
  },
  schema: {
    killmail_id: Number,
    killmail_hash: String,
    killmail_time: Date,
    killmail_time_str: String,
    solar_system_id: Number,
    attackers: [
      {
        character_id: Number,
        corporation_id: Number,
        alliance_id: Number,
        damage_done: Number,
        final_blow: Boolean,
        security_status: Number,
        ship_type_id: Number,
        weapon_type_id: Number,
      },
    ],
    victim: {
      character_id: Number,
      corporation_id: Number,
      alliance_id: Number,
      damage_taken: Number,
      ship_type_id: Number,
      items: [
        {
          item_type_id: Number,
          quantity_destroyed: Number,
          quantity_dropped: Number,
          flag: Number,
          singleton: Number,
        },
      ],
    },
  },
});

export type { KillmailsESI as ESIKillmail };
