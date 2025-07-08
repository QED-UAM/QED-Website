import { Schema, model, Document } from "mongoose";

interface NewsDocument extends Document {
    url: string;
    title: { [key: string]: string };
    description: { [key: string]: string };
}

const newsSchema = new Schema<NewsDocument>({
    url: { type: String, required: true, unique: true },
    title: { type: Map, of: String, default: { es: "" } },
    description: { type: Map, of: String, default: { es: "" } }
});

export const News = model<NewsDocument>("News", newsSchema);
