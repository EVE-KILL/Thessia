import { type Document, type Model, Schema, model } from "mongoose";

export interface IUserDocument extends IUser, Document {}

// Sub-schema for user settings
const userSettingSchema = new Schema<IUserSetting>(
    {
        key: { type: String, required: true },
        value: { type: Schema.Types.Mixed, required: true },
        updatedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const userSchema = new Schema<IUserDocument>(
    {
        accessToken: { type: String, required: true },
        dateExpiration: { type: Date, required: true },
        refreshToken: { type: String, required: true },
        characterId: { type: Number, required: true },
        characterName: { type: String, required: true },
        scopes: { type: [String], required: true },
        tokenType: { type: String, required: true },
        characterOwnerHash: { type: String, required: true },
        uniqueIdentifier: { type: String, required: true },
        lastChecked: { type: Date, default: Date.now },
        canFetchCorporationKillmails: { type: Boolean, default: true },
        esiActive: { type: Boolean, default: true },
        administrator: { type: Boolean, default: false },
        settings: { type: [userSettingSchema], default: [] },
    },
    {
        collection: "users",
        timestamps: true,
        toJSON: {
            transform: (_doc: any, ret: any) => {
                delete ret._id;
                delete (ret as any).__v;
            },
        },
    }
);

// Primary indexes
userSchema.index({ characterId: 1 }, { unique: true });
userSchema.index({ uniqueIdentifier: 1 });
userSchema.index({ administrator: 1 });
userSchema.index({ lastChecked: -1 });

// Text index for searching by character name
userSchema.index({ characterName: "text" });

export const Users: Model<IUserDocument> = model<IUserDocument>(
    "users",
    userSchema,
    "users"
);
