import mongoose, { type Document } from "mongoose";

export interface ISavedQueryDocument extends ISavedQuery, Document {}

const SavedQuerySchema = new mongoose.Schema<ISavedQueryDocument>(
    {
        hash: { type: String, required: true, unique: true, index: true },
        title: { type: String, required: true },
        description: { type: String, default: "" },
        query: { type: Object, required: true },
        createdAt: { type: Date, default: Date.now },
    },
    { collection: "saved_queries" }
);

export const SavedQuery = mongoose.model<ISavedQueryDocument>(
    "SavedQuery",
    SavedQuerySchema,
    "saved_queries"
);
