import { type Document, type Model, Schema, model } from "mongoose";
import { nanoid } from "nanoid";
import type { ICampaign } from "~/server/interfaces/ICampaign";

// Extend the ICampaign interface with Mongoose's Document interface
export interface ICampaignDocument extends ICampaign, Document { }

// Define the Campaigns schema
const campaignsSchema = new Schema<ICampaignDocument>(
    {
        campaign_id: {
            type: String,
            default: () => nanoid(10), // Generate a short unique ID
            unique: true,
            required: true,
            index: true
        },
        name: {
            type: String,
            required: true
        },
        description: {
            type: String
        },
        startTime: {
            type: Date,
            required: true
        },
        endTime: {
            type: Date
        },
        query: {
            type: Schema.Types.Mixed, // For flexible query structure
            required: true
        },
        creator_id: {
            type: Number
        },
        public: {
            type: Boolean,
            default: true
        },
        // Processing status for queue-based campaign generation
        processing_status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending'
        },
        processing_started_at: {
            type: Date
        },
        processing_completed_at: {
            type: Date
        },
        processing_error: {
            type: String
        },
        last_processed_at: {
            type: Date
        },
        // Store the processed campaign data to avoid regenerating
        processed_data: {
            type: Schema.Types.Mixed
        }
    },
    {
        collection: "campaigns",
        timestamps: true, // Automatically adds createdAt and updatedAt fields
        toJSON: {
            transform: (_doc, ret) => {
                delete ret._id; // Removes _id from the JSON output
                delete ret.__v; // Removes __v (version key) from the JSON output
            },
        },
    }
);

// Define indexes for the schema
campaignsSchema.index({ name: 1 });
campaignsSchema.index({ startTime: 1 });
campaignsSchema.index({ endTime: 1 });
campaignsSchema.index({ creator_id: 1 }, { sparse: true });
campaignsSchema.index({ public: 1 });
campaignsSchema.index({ createdAt: 1 });
campaignsSchema.index({ updatedAt: 1 });
campaignsSchema.index({ name: 'text', description: 'text' });

// Create and export the Campaigns model
export const Campaigns: Model<ICampaignDocument> = model<ICampaignDocument>(
    "campaigns",
    campaignsSchema,
    "campaigns" // Explicitly specifying the collection name
);
