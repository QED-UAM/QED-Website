import mongoose, { Schema, type Model, type Types } from "mongoose";
import { Post } from "./post";
import type { LocalizedText } from "./types";
import { DEFAULT_AVATAR } from "../../config";

export interface DirectiveBoardEntry {
    year: string;
    role: string;
}

export interface UserDoc {
    _id: Types.ObjectId;
    url: string;
    name?: string;
    photo?: string;
    socialMedia: Record<string, string>;
    about: LocalizedText;
    directiveBoard?: DirectiveBoardEntry[];
}

const userSchema = new Schema({
    url: { type: String, required: true, unique: true },
    name: { type: String },
    photo: { type: String, default: DEFAULT_AVATAR },
    socialMedia: { type: Map, of: String, default: {} },
    about: { type: Map, of: String, default: { es: "" } },
    directiveBoard: [{ year: String, role: String }]
});

// Deleting a user removes them from the author list of every post.
userSchema.pre("deleteOne", { document: false, query: true }, async function () {
    const user = await this.model.findOne(this.getQuery()).lean();
    if (user) {
        await Post.updateMany(
            { "authors.user_id": user._id },
            { $pull: { authors: { user_id: user._id } } }
        );
    }
});

export const User: Model<UserDoc> =
    (mongoose.models.User as Model<UserDoc>) ??
    mongoose.model<UserDoc>("User", userSchema as Schema<UserDoc>, "users");
