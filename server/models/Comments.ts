// models/Comments.ts

import { Schema, model, type Document, type Model } from "mongoose";
import type { IComments } from "../interfaces/IComments";

// Extend the IConfig interface with Mongoose's Document interface
export interface ICommentsDocument extends IComments, Document {}

// Define the Config schema
const commentsSchema = new Schema<ICommentsDocument>(
  {
    identifier: { type: String, unique: true },
    comment: { type: String },
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
  },
);

export const Comments: Model<ICommentsDocument> = model<ICommentsDocument>(
  "comments",
  commentsSchema,
  "comments",
);
