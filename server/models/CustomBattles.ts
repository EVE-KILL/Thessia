import { type Document, type Model, Schema, model } from "mongoose";
import type {
    ICustomBattles,
    ICustomCharacterShipManifestEntry,
    ICustomEntityItem,
    ICustomEntityStats,
    ICustomSideData,
    ICustomSystemInfo,
    ICustomTeamSummaryStats,
    ICustomTopEntity
} from "~/server/interfaces/ICustomBattles"; // Adjust the path as necessary

// Extend the IBattles interface with Mongoose's Document interface
export interface IBattlesDocument extends ICustomBattles, Document { }

// Define a sub-schema for ICharacterShipManifestEntry
const characterShipManifestEntrySchema = new Schema<ICustomCharacterShipManifestEntry>({
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
const entityStatsSchema = new Schema<ICustomEntityStats>({
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
const teamSummaryStatsSchema = new Schema<ICustomTeamSummaryStats>({
    iskLost: { type: Number, default: 0 },
    shipsLost: { type: Number, default: 0 },
    damageInflicted: { type: Number, default: 0 }
}, { _id: false });

// Define schema for team entity lists
const teamEntitySchema = new Schema<ICustomEntityItem>({
    id: { type: Number, required: true },
    name: { type: String, required: false }
}, { _id: false });

// Define schema for a single side/team
const sideSchema = new Schema<ICustomSideData>({
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
const systemSchema = new Schema<ICustomSystemInfo>({
    system_id: { type: Number, required: true },
    system_name: { type: String, required: false },
    system_security: { type: Number, required: false },
    region_id: { type: Number, required: false },
    region_name: { type: Schema.Types.Mixed, required: false }
}, { _id: false });

// Define schema for top entities (alliances, corporations, ship types)
const topEntitySchema = new Schema<ICustomTopEntity>({
    id: { type: Number, required: true },
    name: { type: Schema.Types.Mixed, required: true }, // Handles string or ITranslation
    count: { type: Number, required: true },
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

        // Legacy fields for backward compatibility and single-system data were here
        // system_id, system_name, region_id, region_name, system_security
        // These are now handled by the 'systems' array to align with ICustomBattles interface.

        killmailsCount: { type: Number },
        iskDestroyed: { type: Number },
        alliancesInvolved: [Number],
        corporationsInvolved: [Number],
        charactersInvolved: [Number],
        involved_alliances_count: { type: Number },
        involved_corporations_count: { type: Number },
        involved_characters_count: { type: Number },

        top_alliances: [topEntitySchema],
        top_corporations: [topEntitySchema],
        top_ship_types: [topEntitySchema],

        // List of all sides/teams
        side_ids: { type: [String], default: [] },

        // Dynamic sides object to store all team data
        sides: { type: Schema.Types.Mixed, default: {} },

        // Main killmail list
        killmail_ids: [Number],

        // Legacy fields for backward compatibility were here.
        // blue_team, red_team, and their associated stats, kill_ids, and manifests
        // are now handled by the 'sides' object to align with ICustomBattles interface.
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
// customBattlesSchema.index({ system_id: 1 }); // Legacy index removed
// customBattlesSchema.index({ region_id: 1 }); // Legacy index removed
