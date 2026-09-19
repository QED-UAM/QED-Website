import mongoose, { Schema, type Model, type Types } from "mongoose";
import type { LocalizedText } from "./types";

export interface NewsDoc {
    _id: Types.ObjectId;
    url: string;
    title: LocalizedText;
    description: LocalizedText;
}

const newsSchema = new Schema({
    url: { type: String, required: true, unique: true },
    title: { type: Map, of: String, default: { es: "" } },
    description: { type: Map, of: String, default: { es: "" } }
});

export const News: Model<NewsDoc> =
    (mongoose.models.News as Model<NewsDoc>) ??
    mongoose.model<NewsDoc>("News", newsSchema as Schema<NewsDoc>, "news");
