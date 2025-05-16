import { Schema, model, type Document } from 'mongoose';
import type { IFullStats, StatsType } from '~/server/interfaces/IStats';

export interface IStatsDocument extends Document {
    type: StatsType;
    id: number;
    days: number;
    kills: number;
    losses: number;
    iskKilled: number;
    iskLost: number;
    npcLosses: number;
    soloKills: number;
    soloLosses: number;
    lastActive: Date | null;
    full: IFullStats;
    updatedAt: Date;
    needsUpdate?: boolean; // Added new field
}

const FullStatsSchema = new Schema<IFullStats>({
    mostUsedShips: { type: Schema.Types.Mixed, default: {} },
    mostLostShips: { type: Schema.Types.Mixed, default: {} },
    diesToCorporations: { type: Schema.Types.Mixed, default: {} },
    diesToAlliances: { type: Schema.Types.Mixed, default: {} },
    blobFactor: Number,
    heatMap: { type: Schema.Types.Mixed, default: {} },
    fliesWithCorporations: { type: Schema.Types.Mixed, default: {} },
    fliesWithAlliances: { type: Schema.Types.Mixed, default: {} },
    sameShipAsOtherAttackers: Number,
    possibleFC: Boolean,
    possibleCynoAlt: Boolean,
}, { _id: false });

const StatsSchema = new Schema<IStatsDocument>({
    type: { type: String, required: true, enum: ['character_id', 'corporation_id', 'alliance_id'] },
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
}, {
    collection: 'stats',
    timestamps: true,
    toJSON: {
        transform: (_doc, ret) => {
            delete ret._id;
            delete ret.__v;
        },
    },
});

StatsSchema.index({ type: 1, id: 1, days: 1 }, { unique: true });

const StatsModel = model<IStatsDocument>('stats', StatsSchema, 'stats');
export { StatsModel as Stats };
