import { type Document, type Model, Schema, model } from "mongoose";
import type { ICustomBattles } from "~/server/interfaces/ICustomBattles"; // Adjust the path as necessary

// Extend the IBattles interface with Mongoose's Document interface
export interface IBattlesDocument extends ICustomBattles, Document { }

// Define a sub-schema for ICharacterShipManifestEntry
const characterShipManifestEntrySchema = new Schema({
    character_id: { type: Number, required: false },
    character_name: { type: String, required: false },
    corporation_id: { type: Number, required: false },
    corporation_name: { type: String, required: false },
    alliance_id: { type: Number, required: false },
    alliance_name: { type: String, required: false },
    ship_type_id: { type: Number, required: true },
    ship_name: { type: Schema.Types.Mixed, required: true }, // Can be ITranslation (Object) or string
    ship_group_id: { type: Number, required: false },
    ship_group_name: { type: Schema.Types.Mixed, required: false }, // Can be ITranslation (Object) or string
    was_lost: { type: Boolean, required: true },
    killmail_id_if_lost: { type: Number, required: false },
    damage_taken: { type: Number, required: false },
    damage_dealt: { type: Number, required: false }
}, { _id: false }); // _id: false for subdocuments if not needed as separate IDs

// Define schema for entity statistics
const entityStatsSchema = new Schema({
    id: { type: Number, required: true },
    name: { type: String, required: true },
    alliance_id: { type: Number, required: false },
    alliance_name: { type: String, required: false },
    kills: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    valueInflicted: { type: Number, default: 0 },
    valueSuffered: { type: Number, default: 0 }
}, { _id: false });

// Define schema for team summary stats
const teamSummaryStatsSchema = new Schema({
    iskLost: { type: Number, default: 0 },
    shipsLost: { type: Number, default: 0 },
    damageInflicted: { type: Number, default: 0 }
}, { _id: false });

// Define schema for team entity lists
const teamEntitySchema = new Schema({
    id: { type: Number, required: true },
    name: { type: String, required: false }
}, { _id: false });

// Define schema for a single side/team
const sideSchema = new Schema({
    name: { type: String, required: false },
    alliances: [teamEntitySchema],
    corporations: [teamEntitySchema],
    kill_ids: { type: [Number], default: [] },
    stats: { type: teamSummaryStatsSchema, default: {} },
    alliances_stats: { type: [entityStatsSchema], default: [] },
    corporations_stats: { type: [entityStatsSchema], default: [] },
    characters_stats: { type: [entityStatsSchema], default: [] },
    ship_manifest: { type: [characterShipManifestEntrySchema], default: [] }
}, { _id: false });

// Define enhanced system schema for storing multiple systems
const systemSchema = new Schema({
    system_id: { type: Number, required: true },
    system_name: { type: String, required: false },
    system_security: { type: Number, required: false },
    region_id: { type: Number, required: false },
    region_name: { type: Schema.Types.Mixed, required: false }
}, { _id: false });

// Define the battles schema
const customBattlesSchema = new Schema<IBattlesDocument>(
    {
        battle_id: { type: Number, unique: true },
        custom: { type: Boolean, default: true },
        start_time: { type: Date, required: true },
        end_time: { type: Date, required: true },
        duration_ms: { type: Number },

        // Systems array for multi-system battles
        systems: [systemSchema],

        // Legacy fields for backward compatibility and single-system data
        system_id: { type: Number },
        system_name: { type: String },
        region_id: { type: Number },
        region_name: { type: Schema.Types.Mixed },
        system_security: { type: Number },

        killmailsCount: { type: Number },
        iskDestroyed: { type: Number },
        alliancesInvolved: [Number],
        corporationsInvolved: [Number],
        charactersInvolved: [Number],
        involved_alliances_count: { type: Number },
        involved_corporations_count: { type: Number },
        involved_characters_count: { type: Number },

        top_alliances: [
            {
                id: Number,
                name: String,
                count: Number,
            },
        ],
        top_corporations: [
            {
                id: Number,
                name: String,
                count: Number,
            },
        ],
        top_ship_types: [
            {
                id: Number,
                name: Schema.Types.Mixed,
                count: Number,
            },
        ],

        // List of all sides/teams
        side_ids: { type: [String], default: [] },

        // Dynamic sides object to store all team data
        sides: { type: Schema.Types.Mixed, default: {} },

        // Main killmail list
        killmail_ids: [Number],

        // Legacy fields for backward compatibility
        blue_team: {
            alliances: [teamEntitySchema],
            corporations: [teamEntitySchema],
        },
        red_team: {
            alliances: [teamEntitySchema],
            corporations: [teamEntitySchema],
        },
        blue_team_kill_ids: [Number],
        red_team_kill_ids: [Number],
        blue_team_stats: teamSummaryStatsSchema,
        red_team_stats: teamSummaryStatsSchema,
        blue_team_alliances_stats: [entityStatsSchema],
        red_team_alliances_stats: [entityStatsSchema],
        blue_team_corporations_stats: [entityStatsSchema],
        red_team_corporations_stats: [entityStatsSchema],
        blue_team_characters_stats: [entityStatsSchema],
        red_team_characters_stats: [entityStatsSchema],
        blue_team_ship_manifest: [characterShipManifestEntrySchema],
        red_team_ship_manifest: [characterShipManifestEntrySchema],
    },
    {
        collection: "custom_battles",
        timestamps: true,
        toJSON: {
            transform: (_doc, ret) => {
                delete ret._id;
                delete ret.__v;
            },
        },
    },
);

// Create and export the battles model
export const CustomBattles: Model<IBattlesDocument> = model<IBattlesDocument>(
    "custom_battles",
    customBattlesSchema,
    "custom_battles",
);

// Apply indexes
customBattlesSchema.index({ charactersInvolved: 1 });
customBattlesSchema.index({ corporationsInvolved: 1 });
customBattlesSchema.index({ alliancesInvolved: 1 });
customBattlesSchema.index({ "systems.system_id": 1 });
customBattlesSchema.index({ "systems.region_id": 1 });
customBattlesSchema.index({ start_time: 1 });
customBattlesSchema.index({ end_time: 1 });
customBattlesSchema.index({ system_id: 1 }); // Legacy index
customBattlesSchema.index({ region_id: 1 }); // Legacy index
