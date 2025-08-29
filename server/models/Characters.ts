import { type Document, type Model, Schema, model } from "mongoose";

// Extend the ICharacter interface with Mongoose's Document interface
export interface ICharacterDocument extends ICharacter, Document {}

// Define the schema for Character History
const characterHistorySchema = new Schema<ICharacterHistory>(
    {
        record_id: { type: Number },
        corporation_id: { type: Number },
        start_date: { type: Date },
    },
    { _id: false } // Prevents automatic creation of _id for subdocuments
);

// Define the main Characters schema
const charactersSchema = new Schema<ICharacterDocument>(
    {
        character_id: { type: Number, unique: true }, // Unique identifier for the character
        name: { type: String }, // Name of the character
        description: { type: String }, // Description of the character
        birthday: { type: Date }, // Birthday of the character
        gender: { type: String }, // Gender of the character
        race_id: { type: Number }, // Race ID
        security_status: { type: Number }, // Security status
        bloodline_id: { type: Number }, // Bloodline ID
        corporation_id: { type: Number }, // Corporation ID
        alliance_id: { type: Number }, // Alliance ID
        faction_id: { type: Number }, // Faction ID
        history: { type: [characterHistorySchema] }, // History array
        deleted: { type: Boolean, default: false }, // Deleted flag
        error: { type: String }, // Error message (optional)
        last_active: { type: Date }, // Last active timestamp
        // Timestamps are automatically added by Mongoose
    },
    {
        collection: "characters",
        timestamps: true, // Automatically adds createdAt and updatedAt fields
        toJSON: {
            transform: (_doc, ret) => {
                delete ret._id; // Removes _id from the JSON output
                delete (ret as any).__v; // Removes __v (version key) from the JSON output
            },
        },
    }
);

// Define indexes for the schema
charactersSchema.index({ corporation_id: 1 }, { sparse: true }); // Sparse index on corporation_id
charactersSchema.index({ alliance_id: 1 }, { sparse: true }); // Sparse index on alliance_id
charactersSchema.index({ faction_id: 1 }, { sparse: true }); // Sparse index on faction_id
charactersSchema.index({ last_active: 1 }, { sparse: true }); // Sparse index on last_active
charactersSchema.index({ createdAt: 1 }, { sparse: true }); // Sparse index on createdAt
charactersSchema.index({ updatedAt: 1 }, { sparse: true }); // Sparse index on updatedAt

// Hook to update Meilisearch on new document save
charactersSchema.post<ICharacterDocument>("save", async function (doc) {
    if (this.isNew) {
        try {
            const meilisearch = new Meilisearch();
            const characterDocument = {
                id: doc.character_id,
                name: doc.name,
                type: "character",
                rank: 7,
                lang: "all",
                deleted: doc.deleted || false,
                last_active: doc.last_active
                    ? doc.last_active.toISOString()
                    : undefined,
                updatedAt: doc.updatedAt
                    ? doc.updatedAt.toISOString()
                    : undefined,
            };
            await meilisearch.addDocuments("nitro", [characterDocument]);
            cliLogger.info(
                `Indexed new character ${doc.character_id} in Meilisearch`
            );
        } catch (error) {
            cliLogger.error(
                `Error indexing new character ${doc.character_id} in Meilisearch: ${error}`
            );
        }
    }
});

// Create and export the Characters model
export const Characters: Model<ICharacterDocument> = model<ICharacterDocument>(
    "characters",
    charactersSchema,
    "characters" // Explicitly specifying the collection name
);
