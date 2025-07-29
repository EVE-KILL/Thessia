// models/Comments.ts

import { type Document, type Model, Schema, model } from "mongoose";
import type { IComments } from "~/server/interfaces/IComments";

// Extend the IComments interface with Mongoose's Document interface
export interface ICommentsDocument extends IComments, Document {}

// Define the Comments schema
const commentsSchema = new Schema<ICommentsDocument>(
    {
        identifier: {
            type: String,
            required: true,
            unique: true,
        },
        killIdentifier: {
            type: String,
            required: true,
            index: true, // Index for faster queries but not unique
        },
        comment: { type: String, required: true },
        characterId: { type: Number, required: true },
        characterName: { type: String, required: true },
        corporationId: { type: Number, required: true },
        corporationName: { type: String, required: true },
        allianceId: { type: Number },
        allianceName: { type: String },

        // New fields for deletion and reporting
        deleted: { type: Boolean, default: false },
        reported: { type: Boolean, default: false },
        reportMessages: [
            {
                reporterId: { type: Number, required: true },
                reporterName: { type: String, required: true },
                message: { type: String, required: true },
                timestamp: { type: Date, default: Date.now },
            },
        ],
    },
    {
        collection: "comments",
        timestamps: true, // Automatically adds createdAt and updatedAt fields
        toJSON: {
            transform: (_doc, ret) => {
                delete ret._id; // Removes _id from the JSON output
                delete ret.__v; // Removes __v (version key) from the JSON output
            },
        },
    }
);

// Create a compound index for efficiently retrieving comments by killIdentifier and sorting by createdAt
commentsSchema.index({ killIdentifier: 1, createdAt: -1 });

// Create a text search index for searching comment content
commentsSchema.index({
    comment: "text",
    characterName: "text",
    corporationName: "text",
    allianceName: "text",
});

export const Comments: Model<ICommentsDocument> = model<ICommentsDocument>(
    "comments",
    commentsSchema,
    "comments"
);
