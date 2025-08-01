import { type Document, type Model, Schema, model } from "mongoose";

// Extend the ICampaign interface with Mongoose's Document interface
export interface ICampaignDocument extends ICampaign, Document {}

// Define the Campaigns schema
const campaignSchema = new Schema<ICampaignDocument>(
    {
        campaign_id: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        description: { type: String },
        startTime: { type: Date, required: true },
        endTime: { type: Date },
        query: { type: Schema.Types.Mixed, required: true },
        creator_id: { type: Number },
        public: { type: Boolean, required: true, default: true },
        processing_status: {
            type: String,
            enum: ["pending", "processing", "completed", "failed"],
            default: "pending",
        },
        processing_started_at: { type: Date },
        processing_completed_at: { type: Date },
        processing_error: { type: String },
        last_processed_at: { type: Date },
        processed_data: {
            type: Schema.Types.Mixed,
            strict: false, // Allow flexible schema for enhanced statistics
        },
    },
    {
        timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
        strict: false, // Allow additional fields to be added
    }
);

// Define indexes for the schema
campaignSchema.index({ name: 1 });
campaignSchema.index({ startTime: 1 });
campaignSchema.index({ endTime: 1 });
campaignSchema.index({ startTime: 1, endTime: 1 });
campaignSchema.index({ creator_id: 1 }, { sparse: true });
campaignSchema.index({ public: 1 });
campaignSchema.index({ createdAt: 1 });
campaignSchema.index({ updatedAt: 1 });
campaignSchema.index({ name: "text", description: "text" });

// Create and export the Campaigns model
export const Campaigns: Model<ICampaignDocument> = model<ICampaignDocument>(
    "campaigns",
    campaignSchema,
    "campaigns" // Explicitly specifying the collection name
);
