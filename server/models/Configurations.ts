import { type Document, type Model, Schema, model } from "mongoose";
import type { IConfiguration } from "../interfaces/IConfiguration";

export interface IConfigurationDocument extends IConfiguration, Document {}

const configurationSchema = new Schema<IConfigurationDocument>(
    {
        characterId: { type: Number, default: null },
        corporationId: { type: Number, default: null },
        allianceId: { type: Number, default: null },
        all: { type: Boolean, default: false },
        key: { type: String, required: true },
        value: { type: Schema.Types.Mixed, required: true },
    },
    {
        collection: "configurations",
        timestamps: true,
        toJSON: {
            transform: (_doc: any, ret: any) => {
                delete ret._id;
                delete ret.__v;
            },
        },
    }
);

// Compound index for efficient querying
configurationSchema.index(
    {
        characterId: 1,
        corporationId: 1,
        allianceId: 1,
        all: 1,
        key: 1,
    },
    { unique: true }
);

// Additional indexes for common query patterns
configurationSchema.index({ key: 1 });
configurationSchema.index({ characterId: 1, key: 1 }, { sparse: true });
configurationSchema.index({ corporationId: 1, key: 1 }, { sparse: true });
configurationSchema.index({ allianceId: 1, key: 1 }, { sparse: true });
configurationSchema.index({ all: 1, key: 1 });

export const Configuration = model<IConfigurationDocument>(
    "Configuration",
    configurationSchema
);
