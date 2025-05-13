import { type Document, type Model, Schema, model } from "mongoose";
import type { IDScan } from "~/server/interfaces/IDScan";

export interface IDScanDocument extends IDScan, Document { }

const dScanSchema = new Schema<IDScanDocument>(
    {
        ships: { type: Schema.Types.Mixed, required: true },
        hash: { type: String, required: true, unique: true },
    },
    {
        collection: "dscans",
        timestamps: true,
        toJSON: {
            transform: (_doc, ret) => {
                delete ret._id;
                delete ret.__v;
            },
        },
    }
);

dScanSchema.index({ hash: 1 }, { unique: true });
dScanSchema.index({ createdAt: 1 }, { sparse: true });
dScanSchema.index({ updatedAt: 1 }, { sparse: true });

export const DScan: Model<IDScanDocument> = model<IDScanDocument>(
    "dscans",
    dScanSchema,
    "dscans"
);
