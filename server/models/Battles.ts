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
        system_name: { type: String }, // Reverted to String
        region_name: { type: Object }, // Stays Object for multilingual support
        system_security: { type: Number },
        duration_ms: { type: Number },
        killmailsCount: { type: Number },
        iskDestroyed: { type: Number },
        alliancesInvolved: [Number],
        corporationsInvolved: [Number],
        charactersInvolved: [Number],
        involved_alliances_count: { type: Number },
        involved_corporations_count: { type: Number },
        involved_characters_count: { type: Number },
        top_alliances: [
            {
                id: Number,
                name: String, // Reverted to String
                count: Number,
            },
        ],
        top_corporations: [
            {
                id: Number,
                name: String, // Reverted to String
                count: Number,
            },
        ],
        top_ship_types: [
            {
                id: Number,
                name: Object, // Stays Object for multilingual ship names
                count: Number,
            },
        ],
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
        },
        // New fields for detailed data based on IBattles interface
        killmail_ids: [Number], // For the timeline, changed from killmails

        blue_team_kill_ids: [Number], // Changed from blue_team_kills
        red_team_kill_ids: [Number],   // Changed from red_team_kills

        blue_team_stats: {
            iskLost: Number,
            shipsLost: Number,
            damageInflicted: Number
        },
        red_team_stats: {
            iskLost: Number,
            shipsLost: Number,
            damageInflicted: Number
        },

        blue_team_alliances_stats: [
            {
                id: Number,
                name: String,
                alliance_id: Number,
                alliance_name: String,
                kills: Number,
                losses: Number,
                valueInflicted: Number,
                valueSuffered: Number
            }
        ],
        red_team_alliances_stats: [
            {
                id: Number,
                name: String,
                alliance_id: Number,
                alliance_name: String,
                kills: Number,
                losses: Number,
                valueInflicted: Number,
                valueSuffered: Number
            }
        ],
        blue_team_corporations_stats: [
            {
                id: Number,
                name: String,
                alliance_id: Number,
                alliance_name: String,
                kills: Number,
                losses: Number,
                valueInflicted: Number,
                valueSuffered: Number
            }
        ],
        red_team_corporations_stats: [
            {
                id: Number,
                name: String,
                alliance_id: Number,
                alliance_name: String,
                kills: Number,
                losses: Number,
                valueInflicted: Number,
                valueSuffered: Number
            }
        ],
        blue_team_characters_stats: [
            {
                id: Number,
                name: String,
                alliance_id: Number,
                alliance_name: String,
                kills: Number,
                losses: Number,
                valueInflicted: Number,
                valueSuffered: Number
            }
        ],
        red_team_characters_stats: [
            {
                id: Number,
                name: String,
                alliance_id: Number,
                alliance_name: String,
                kills: Number,
                losses: Number,
                valueInflicted: Number,
                valueSuffered: Number
            }
        ]
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
