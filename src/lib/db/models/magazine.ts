import mongoose, { Schema, type Model, type Types } from "mongoose";
import { Post } from "./post";
import type { LocalizedText } from "./types";

export interface MagazineDoc {
    _id: Types.ObjectId;
    url: string;
    cover?: string;
    visible: boolean;
    title: LocalizedText;
    description: LocalizedText;
}

const magazineSchema = new Schema({
    url: { type: String, required: true, unique: true },
    cover: { type: String },
    visible: { type: Boolean, required: true, default: false },
    title: { type: Map, of: String, required: true },
    description: { type: Map, of: String, default: { es: "" } }
});

// Deleting a magazine detaches its posts instead of deleting them.
magazineSchema.pre("deleteOne", { document: false, query: true }, async function () {
    const magazine = await this.model.findOne(this.getQuery()).lean();
    if (magazine) {
        await Post.updateMany({ magazine_id: magazine._id }, { $unset: { magazine_id: 1 } });
    }
});

export const Magazine: Model<MagazineDoc> =
    (mongoose.models.Magazine as Model<MagazineDoc>) ??
    mongoose.model<MagazineDoc>("Magazine", magazineSchema as Schema<MagazineDoc>, "magazines");
