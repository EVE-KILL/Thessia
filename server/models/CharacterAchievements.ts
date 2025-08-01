import { type Document, type Model, Schema, model } from "mongoose";

// Extend the ICharacterAchievements interface with Mongoose's Document interface
export interface ICharacterAchievementsDocument
    extends ICharacterAchievements,
        Document {}

// Define the individual achievement schema
const characterAchievementSchema = new Schema<ICharacterAchievement>(
    {
        achievement_id: { type: String, required: true },
        name: { type: String, required: true },
        description: { type: String, required: true },
        type: {
            type: String,
            required: true,
            enum: ["pvp", "pve", "exploration", "industry", "special"],
        },
        points: { type: Number, required: true },
        rarity: {
            type: String,
            required: true,
            enum: ["common", "uncommon", "rare", "epic", "legendary"],
        },
        category: { type: String, required: true },
        threshold: { type: Number, required: true },
        current_count: { type: Number, required: true, default: 0 },
        is_completed: { type: Boolean, required: true, default: false },
        completion_tiers: { type: Number, required: true, default: 0 },
        completed_at: { type: Date },
        last_updated: { type: Date, required: true, default: Date.now },
        killmailIds: { type: [Number], default: undefined }, // Optional array of killmail IDs
    },
    { _id: false } // Don't create separate _id for subdocuments
);

// Define the main CharacterAchievements schema
const characterAchievementsSchema = new Schema<ICharacterAchievementsDocument>(
    {
        character_id: { type: Number, required: true, unique: true },
        character_name: { type: String },
        total_points: { type: Number, required: true, default: 0 },
        completed_achievements: { type: Number, required: true, default: 0 },
        total_achievements: { type: Number, required: true, default: 0 },
        achievements: { type: [characterAchievementSchema], default: [] },
        last_calculated: { type: Date, required: true, default: Date.now },
        needs_processing: { type: Boolean, required: true, default: false },
        updatedAt: { type: Date },
        createdAt: { type: Date },
    },
    {
        collection: "character_achievements",
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
// Define indexes for the schema
characterAchievementsSchema.index({ character_name: 1 }, { sparse: true });
characterAchievementsSchema.index({ total_points: -1 }, { sparse: true });
characterAchievementsSchema.index(
    { completed_achievements: -1 },
    { sparse: true }
);
characterAchievementsSchema.index({ last_calculated: 1 }, { sparse: true });
characterAchievementsSchema.index({ needs_processing: 1 }, { sparse: true });
characterAchievementsSchema.index({ createdAt: 1 }, { sparse: true });
characterAchievementsSchema.index({ updatedAt: 1 }, { sparse: true });

// Indexes for achievement queries (even though we said we won't query individual achievements, these might be useful for analytics)
characterAchievementsSchema.index(
    { "achievements.achievement_id": 1 },
    { sparse: true }
);
characterAchievementsSchema.index(
    { "achievements.is_completed": 1 },
    { sparse: true }
);
characterAchievementsSchema.index({ "achievements.type": 1 }, { sparse: true });
characterAchievementsSchema.index(
    { "achievements.rarity": 1 },
    { sparse: true }
);
characterAchievementsSchema.index(
    { "achievements.category": 1 },
    { sparse: true }
);
characterAchievementsSchema.index(
    { "achievements.completed_at": 1 },
    { sparse: true }
);

// Compound indexes for leaderboards and statistics
characterAchievementsSchema.index(
    { total_points: -1, completed_achievements: -1 },
    { sparse: true }
);
characterAchievementsSchema.index(
    { completed_achievements: -1, total_points: -1 },
    { sparse: true }
);

// Pre-save middleware to calculate totals
characterAchievementsSchema.pre("save", function (next) {
    if (this.isModified("achievements")) {
        (this as any).total_achievements = (this as any).achievements.length;
        (this as any).completed_achievements = (
            this as any
        ).achievements.filter(
            (achievement: any) => achievement.is_completed
        ).length;
        (this as any).total_points = (this as any).achievements
            .filter((achievement: any) => achievement.is_completed)
            .reduce(
                (total: number, achievement: any) => total + achievement.points,
                0
            );
        (this as any).last_calculated = new Date();
    }
    next();
});

// Create and export the CharacterAchievements model
export const CharacterAchievements: Model<ICharacterAchievementsDocument> =
    model<ICharacterAchievementsDocument>(
        "characterAchievements",
        characterAchievementsSchema,
        "characterAchievements"
    );
