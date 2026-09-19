import mongoose, { Schema, type Model, type Types } from "mongoose";
import type { LocalizedText } from "./types";

export interface PostAuthor {
    user_id: Types.ObjectId;
    role: string;
}

export interface PostDoc {
    _id: Types.ObjectId;
    url: string;
    title: LocalizedText;
    type: string;
    description: LocalizedText;
    scripts?: string;
    content: LocalizedText;
    /** Legacy: the tag system was removed in v2. Kept so existing documents keep their shape. */
    tags: string[];
    authors: PostAuthor[];
    magazine_id?: Types.ObjectId | null;
    views: number;
    /** Added in v2: set whenever the post is saved from the admin panel. */
    updated_at?: Date;
}

const authorSchema = new Schema(
    {
        user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
        role: { type: String, required: true }
    },
    { _id: false }
);

const postSchema = new Schema({
    url: { type: String, required: true, unique: true },
    title: { type: Map, of: String, default: { es: "" } },
    type: { type: String, default: "post" },
    description: { type: Map, of: String, default: { es: "" } },
    scripts: { type: String },
    content: { type: Map, of: String, default: { es: "" } },
    tags: { type: [String], default: [] },
    authors: [authorSchema],
    magazine_id: { type: Schema.Types.ObjectId, ref: "Magazine" },
    views: { type: Number, default: 0 },
    updated_at: { type: Date }
});

export const Post: Model<PostDoc> =
    (mongoose.models.Post as Model<PostDoc>) ??
    mongoose.model<PostDoc>("Post", postSchema as Schema<PostDoc>, "posts");
