import { type Document, type Model, Schema, model } from "mongoose";

// Extend the IFaction interface with Mongoose's Document interface
export interface IFactionDocument extends IFaction, Document {}

// Define the Factions schema
const factionsSchema = new Schema<IFactionDocument>(
    {
        faction_id: { type: Number, unique: true },
        corporation_id: { type: Number },
        description: { type: String },
        militia_corporation_id: { type: Number },
        name: { type: String },
        size_factor: { type: Number },
        solar_system_id: { type: Number },
        station_count: { type: Number },
        station_system_count: { type: Number },
        icon_id: { type: Number },
        race_ids: { type: Number },
        ceo_id: { type: Number },
        creator_id: { type: Number },
        home_station_id: { type: Number },
        updatedAt: { type: Date },
        createdAt: { type: Date },
    },
    {
        collection: "factions",
        timestamps: true,
        toJSON: {
            transform: (_doc, ret) => {
                delete ret._id;
                delete (ret as any).__v;
            },
        },
    }
);

// Define indexes for the schema
factionsSchema.index({ corporation_id: 1 }, { sparse: true });

// Create and export the Factions model
export const Factions: Model<IFactionDocument> = model<IFactionDocument>(
    "factions",
    factionsSchema,
    "factions" // Explicitly specifying the collection name
);
