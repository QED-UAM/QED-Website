import { Schema, model, Document } from "mongoose";
import { Post } from "./post";

interface MagazineDocument extends Document {
    url: string;
    cover: string;
    visible: boolean;
    title: { [key: string]: string };
    description: { [key: string]: string };
}

const magazineSchema = new Schema<MagazineDocument>({
    url: { type: String, required: true, unique: true },
    cover: { type: String },
    visible: { type: Boolean, required: true, default: false },
    title: { type: Map, of: String, required: true },
    description: { type: Map, of: String, default: { es: "" } }
});

magazineSchema.pre("deleteOne", async function (next) {
    const magazine = await this.model.findOne(this.getQuery());
    if (magazine) {
        await Post.updateMany({ magazine_id: magazine._id }, { $unset: { magazine_id: 1 } });
    }
    next();
});

export const Magazine = model<MagazineDocument>("Magazine", magazineSchema);
