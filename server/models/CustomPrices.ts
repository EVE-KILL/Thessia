import { type Document, type Model, Schema, model } from "mongoose";

export interface ICustomPriceDocument extends ICustomPrice, Document {}

const customPricesSchema = new Schema<ICustomPriceDocument>(
    {
        type_id: { type: Number },
        price: { type: Number },
        date: { type: Date },
    },
    {
        collection: "customPrices",
        timestamps: true,
        toJSON: {
            transform: (_doc, ret) => {
                delete ret._id;
                delete (ret as any).__v;
            },
        },
    }
);

customPricesSchema.index({ type_id: 1, date: 1 }, { unique: true });

export const CustomPrices: Model<ICustomPriceDocument> =
    model<ICustomPriceDocument>(
        "customprices",
        customPricesSchema,
        "customPrices"
    );
