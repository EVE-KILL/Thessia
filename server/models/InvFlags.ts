import { type Document, type Model, Schema, model } from "mongoose";

// Extend the IInvFlag interface with Mongoose's Document interface
export interface IInvFlagDocument extends IInvFlag, Document {}

// Define the InvFlags schema
const invFlagsSchema = new Schema<IInvFlagDocument>(
    {
        flag_id: { type: Number, unique: true },
        flag_name: { type: String },
        flag_text: { type: String },
        order_id: { type: Number },
        // Timestamps are automatically added by Mongoose
    },
    {
        collection: "invFlags",
        timestamps: true, // Automatically adds createdAt and updatedAt fields
        toJSON: {
            transform: (_doc, ret) => {
                delete ret._id; // Removes _id from the JSON output
                delete (ret as any).__v; // Removes __v (version key) from the JSON output
            },
        },
    }
);

// Create and export the InvFlags model
export const InvFlags: Model<IInvFlagDocument> = model<IInvFlagDocument>(
    "invflags",
    invFlagsSchema,
    "invFlags" // Explicitly specifying the collection name
);
