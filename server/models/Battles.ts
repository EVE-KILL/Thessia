import { type Document, type Model, Schema, model } from "mongoose";
import type { IBattles } from "~/server/interfaces/IBattles"; // Adjust the path as necessary

// Extend the IBattles interface with Mongoose's Document interface
export interface IBattlesDocument extends IBattles, Document { }

// Define the battles schema
const battlesSchema = new Schema<IBattlesDocument>(
    {
        battle_id: { type: Number, unique: true },
        start_time: { type: Date },
        end_time: { type: Date },
        system_id: { type: Number },
        killmailsCount: { type: Number },
        iskDestroyed: { type: Number },
        alliancesInvolved: [Number],
        corporationsInvolved: [Number],
        charactersInvolved: [Number],
        blue_team: {
            alliances: [
                {
                    id: Number,
                    name: String,
                }
            ],
            corporations: [
                {
                    id: Number,
                    name: String,
                }
            ]
        },
        red_team: {
            alliances: [
                {
                    id: Number,
                    name: String,
                }
            ],
            corporations: [
                {
                    id: Number,
                    name: String,
                }
            ]
        }
    },
    {
        collection: "battles",
        timestamps: true, // Automatically adds createdAt and updatedAt fields
        toJSON: {
            transform: (_doc, ret) => {
                delete ret._id; // Removes _id from the JSON output
                delete ret.__v; // Removes __v (version key) from the JSON output
            },
        },
    },
);

// Create and export the battles model
export const Battles: Model<IBattlesDocument> = model<IBattlesDocument>(
    "battles",
    battlesSchema,
    "battles",
);
