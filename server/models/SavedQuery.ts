import mongoose from "mongoose";

const SavedQuerySchema = new mongoose.Schema(
    {
        hash: { type: String, required: true, unique: true, index: true },
        title: { type: String, required: true },
        description: { type: String, default: "" },
        query: { type: Object, required: true },
        createdAt: { type: Date, default: Date.now },
    },
    { collection: "saved_queries" }
);

export const SavedQuery =
    mongoose.models.SavedQuery || mongoose.model("SavedQuery", SavedQuerySchema);
