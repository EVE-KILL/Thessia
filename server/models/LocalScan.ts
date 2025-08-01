import { model, Model, Schema, type Document } from "mongoose";

// Define the LocalScan schema
export interface ILocalScanDocument extends ILocalScan, Document {}

const localScanSchema = new Schema<ILocalScanDocument>(
    {
        alliances: { type: Schema.Types.Mixed, required: true },
        corporations: { type: Schema.Types.Mixed, required: true },
        hash: { type: String, required: true, unique: true },
    },
    {
        collection: "localscans",
        timestamps: true,
        toJSON: {
            transform: (_doc, ret) => {
                delete ret._id;
                delete (ret as any).__v;
            },
        },
    }
);

localScanSchema.index({ createdAt: 1 }, { sparse: true });
localScanSchema.index({ updatedAt: 1 }, { sparse: true });

export const LocalScan: Model<ILocalScanDocument> = model<ILocalScanDocument>(
    "localscans",
    localScanSchema,
    "localscans"
);
