import { Schema, model, Document } from "mongoose";

interface Author {
    user_id: Schema.Types.ObjectId;
    role: string;
}

interface PostDocument extends Document {
    url: string;
    title: { [key: string]: string };
    type: string;
    description: { [key: string]: string };
    scripts: string;
    content: { [key: string]: string };
    tags: string[];
    authors: Author[];
    magazine_id: Schema.Types.ObjectId;
    views: number;
    incrementViews: () => Promise<PostDocument>;
}

const authorSchema = new Schema(
    {
        user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
        role: { type: String, required: true }
    },
    { _id: false }
);

const postSchema = new Schema<PostDocument>({
    url: { type: String, required: true, unique: true },
    title: { type: Map, of: String, default: { es: "" } },
    type: { type: String, default: "post" },
    description: { type: Map, of: String, default: { es: "" } },
    scripts: { type: String },
    content: { type: Map, of: String, default: { es: "" } },
    tags: { type: [String], default: [] },
    authors: [authorSchema],
    magazine_id: { type: Schema.Types.ObjectId, ref: "Magazine" },
    views: { type: Number, default: 0 }
});

postSchema.methods.incrementViews = function () {
    this.views += 1;
    return this.save();
};

export const Post = model<PostDocument>("Post", postSchema);
