import { type Document, type Model, Schema, model } from "mongoose";
import type { IApiKey } from "../interfaces/IApiKey";

// Extend the IApiKey interface with Mongoose's Document interface
export interface IApiKeyDocument extends IApiKey, Document {}

// Define the ApiKey schema
const apiKeySchema = new Schema<IApiKeyDocument>(
    {
        name: { type: String, required: true },
        key: { type: String, unique: true, required: true },
        description: { type: String },
        active: { type: Boolean, default: true },
        lastUsed: { type: Date },
        createdBy: { type: Number, required: true },
    },
    {
        collection: "apikeys",
        timestamps: true, // Automatically adds createdAt and updatedAt fields
        toJSON: {
            transform: (_doc, ret) => {
                delete ret._id; // Removes _id from the JSON output
                delete (ret as any).__v; // Removes __v (version key) from the JSON output
            },
        },
    }
);

// Create index for key lookup performance
apiKeySchema.index({ active: 1 });
apiKeySchema.index({ createdBy: 1 });

// Create and export the ApiKey model
export const ApiKeys: Model<IApiKeyDocument> = model<IApiKeyDocument>(
    "apikeys",
    apiKeySchema,
    "apikeys" // Explicitly specifying the collection name
);
