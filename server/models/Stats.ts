import { Schema, model, type Document } from "mongoose";

export interface IStatsMongooseDocument
    extends Document,
        Omit<IStatsDocument, "id"> {
    id: number; // Our custom id field, overriding Document's string id
}

const FullStatsSchema = new Schema<IFullStats>(
    {
        mostUsedShips: { type: Schema.Types.Mixed, default: {} },
        mostLostShips: { type: Schema.Types.Mixed, default: {} },
        mostValuableKills: [
            {
                killmail_id: Number,
                total_value: Number,
                victim: {
                    ship_id: Number,
                    ship_name: Schema.Types.Mixed,
                    character_id: Number,
                    character_name: String,
                    corporation_id: Number,
                    corporation_name: String,
                    alliance_id: Number,
                    alliance_name: String,
                },
                final_blow: {
                    character_id: Number,
                    character_name: String,
                    ship_id: Number,
                    ship_name: Schema.Types.Mixed,
                },
            },
        ],
        mostValuableShips: [
            {
                ship_id: Number,
                ship_name: Schema.Types.Mixed,
                total_value: Number,
                count: Number,
            },
        ],
        mostValuableStructures: [
            {
                type_id: Number,
                type_name: Schema.Types.Mixed,
                total_value: Number,
                count: Number,
                system_id: Number,
                system_name: String,
            },
        ],
        topCharacters: [
            {
                id: Number,
                character_id: Number,
                name: String,
                count: Number,
            },
        ],
        topCorporations: [
            {
                id: Number,
                corporation_id: Number,
                name: String,
                count: Number,
            },
        ],
        topShips: [
            {
                id: Number,
                type_id: Number,
                name: Schema.Types.Mixed,
                count: Number,
            },
        ],
        topSystems: [
            {
                id: Number,
                system_id: Number,
                name: Schema.Types.Mixed,
                count: Number,
            },
        ],
        topConstellations: [
            {
                id: Number,
                constellation_id: Number,
                name: Schema.Types.Mixed,
                count: Number,
            },
        ],
        topRegions: [
            {
                id: Number,
                region_id: Number,
                name: Schema.Types.Mixed,
                count: Number,
            },
        ],
        shipGroupStats: [
            {
                groupName: String,
                kills: Number,
                losses: Number,
                efficiency: Number,
            },
        ],
        monthlyStats: [
            {
                year: Number,
                month: Number,
                monthLabel: String,
                kills: Number,
                iskKilled: Number,
                losses: Number,
                iskLost: Number,
                efficiency: Number,
            },
        ],
        diesToCorporations: { type: Schema.Types.Mixed, default: {} },
        diesToAlliances: { type: Schema.Types.Mixed, default: {} },
        blobFactor: Number,
        heatMap: { type: Schema.Types.Mixed, default: {} },
        fliesWithCorporations: { type: Schema.Types.Mixed, default: {} },
        fliesWithAlliances: { type: Schema.Types.Mixed, default: {} },
        sameShipAsOtherAttackers: Number,
        possibleFC: Boolean,
        possibleCynoAlt: Boolean,
    },
    { _id: false }
);

const StatsSchema = new Schema<IStatsMongooseDocument>(
    {
        type: {
            type: String,
            required: true,
            enum: ["character_id", "corporation_id", "alliance_id"],
        },
        id: { type: Number, required: true },
        days: { type: Number, required: true },
        kills: Number,
        losses: Number,
        iskKilled: Number,
        iskLost: Number,
        npcLosses: Number,
        soloKills: Number,
        soloLosses: Number,
        lastActive: Date,
        full: { type: FullStatsSchema, required: true },
        updatedAt: { type: Date, default: Date.now },
        needsUpdate: { type: Boolean, default: false }, // Added new field to schema
    },
    {
        collection: "stats",
        timestamps: true,
        toJSON: {
            transform: (_doc, ret) => {
                delete (ret as any)._id;
                delete (ret as any).__v;
            },
        },
    }
);

StatsSchema.index({ type: 1, id: 1, days: 1 }, { unique: true });
StatsSchema.index({ needsUpdate: 1, days: 1 });
StatsSchema.index({ type: 1, id: 1, "full.possibleFC": 1 });
StatsSchema.index({ type: 1, id: 1, "full.possibleCynoAlt": 1 });

const StatsModel = model<IStatsMongooseDocument>("stats", StatsSchema, "stats");
export { StatsModel as Stats };
