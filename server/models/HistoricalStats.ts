import { type Document, type Model, Schema, model } from "mongoose";

// Extend the IHistoricalStat interface with Mongoose's Document interface
export interface IHistoricalStatDocument extends IHistoricalStat, Document {}

// Define the Alliances schema
const historicalStatsSchema = new Schema<IHistoricalStatDocument>(
    {
        alliance_id: { type: Number, required: true },
        corporation_id: { type: Number, required: true },
        count: { type: Number, required: true },
        previousCount: { type: Number },
        date: { type: Date, required: true },
        sum_sec_status: { type: Number },
        avg_sec_status: { type: Number }, // Added average security status
        pirate_members: { type: Number },
        carebear_members: { type: Number },
        neutral_members: { type: Number },
        // Add pre-calculated change fields
        change_1d: { type: Number },
        change_7d: { type: Number },
        change_14d: { type: Number },
        change_30d: { type: Number },
        // Achievement-related fields
        total_achievement_points: { type: Number },
        avg_achievement_points: { type: Number },
        top_achievement_character_id: { type: Number },
        top_achievement_character_points: { type: Number },
        historicalCounts: [
            {
                count: { type: Number, required: true },
                date: { type: Date, required: true },
            },
        ],
        updatedAt: { type: Date },
        createdAt: { type: Date },
    },
    {
        collection: "historical_stats",
        timestamps: true, // Automatically adds createdAt and updatedAt fields
        toJSON: {
            transform: (_doc, ret) => {
                delete ret._id; // Removes _id from the JSON output
                delete (ret as any).__v; // Removes __v (version key) from the JSON output
            },
        },
    }
);

// Define indexes for the schema
historicalStatsSchema.index(
    { alliance_id: 1, corporation_id: 1 },
    { unique: true }
);
historicalStatsSchema.index({ alliance_id: 1 }, { sparse: true });
historicalStatsSchema.index({ corporation_id: 1 }, { sparse: true });
historicalStatsSchema.index({ date: 1 }, { sparse: true });
historicalStatsSchema.index({ createdAt: 1 }, { sparse: true });
historicalStatsSchema.index({ updatedAt: 1 }, { sparse: true });
historicalStatsSchema.index({ count: 1 }, { sparse: true });
historicalStatsSchema.index({ pirate_members: -1 }, { sparse: true });
historicalStatsSchema.index({ carebear_members: -1 }, { sparse: true });
// Add indexes for the new pre-calculated change fields
historicalStatsSchema.index({ change_1d: -1 }, { sparse: true });
historicalStatsSchema.index({ change_7d: -1 }, { sparse: true });
historicalStatsSchema.index({ change_14d: -1 }, { sparse: true });
historicalStatsSchema.index({ change_30d: -1 }, { sparse: true });
// Add index for avg_sec_status
historicalStatsSchema.index({ avg_sec_status: 1 }, { sparse: true });
// Add indexes for achievement fields
historicalStatsSchema.index({ total_achievement_points: -1 }, { sparse: true });
historicalStatsSchema.index({ avg_achievement_points: -1 }, { sparse: true });
historicalStatsSchema.index(
    { top_achievement_character_points: -1 },
    { sparse: true }
);
// Keep compound indexes
historicalStatsSchema.index({ alliance_id: 1, count: -1 }, { sparse: true });
historicalStatsSchema.index({ corporation_id: 1, count: -1 }, { sparse: true });
historicalStatsSchema.index(
    { alliance_id: 1, pirate_members: -1 },
    { sparse: true }
);
historicalStatsSchema.index(
    { corporation_id: 1, pirate_members: -1 },
    { sparse: true }
);
historicalStatsSchema.index(
    { alliance_id: 1, carebear_members: -1 },
    { sparse: true }
);
historicalStatsSchema.index(
    { corporation_id: 1, carebear_members: -1 },
    { sparse: true }
);
// Add compound indexes for changes
historicalStatsSchema.index(
    { alliance_id: 1, change_1d: -1 },
    { sparse: true }
);
historicalStatsSchema.index(
    { corporation_id: 1, change_1d: -1 },
    { sparse: true }
);
// Add compound indexes for achievement points
historicalStatsSchema.index(
    { alliance_id: 1, total_achievement_points: -1 },
    { sparse: true }
);
historicalStatsSchema.index(
    { corporation_id: 1, total_achievement_points: -1 },
    { sparse: true }
);
historicalStatsSchema.index(
    { alliance_id: 1, avg_achievement_points: -1 },
    { sparse: true }
);
historicalStatsSchema.index(
    { corporation_id: 1, avg_achievement_points: -1 },
    { sparse: true }
);
historicalStatsSchema.index(
    { alliance_id: 1, change_7d: -1 },
    { sparse: true }
);
historicalStatsSchema.index(
    { corporation_id: 1, change_7d: -1 },
    { sparse: true }
);
historicalStatsSchema.index(
    { alliance_id: 1, change_14d: -1 },
    { sparse: true }
);
historicalStatsSchema.index(
    { corporation_id: 1, change_14d: -1 },
    { sparse: true }
);
historicalStatsSchema.index(
    { alliance_id: 1, change_30d: -1 },
    { sparse: true }
);
historicalStatsSchema.index(
    { corporation_id: 1, change_30d: -1 },
    { sparse: true }
);

// Create and export the Alliances model
export const HistoricalStats: Model<IHistoricalStatDocument> =
    model<IHistoricalStatDocument>(
        "historical_stats",
        historicalStatsSchema,
        "historical_stats"
    );
