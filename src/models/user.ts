import { Schema, model } from "mongoose";
import { Post } from "./post";

interface UserDocument extends Document {
    url: string;
    name: string;
    photo: string;
    socialMedia: { [key: string]: string };
    about: { [key: string]: string };
    directiveBoard: { year: string; role: string }[];
}

const userSchema = new Schema({
    url: { type: String, required: true, unique: true },
    name: { type: String },
    photo: {
        type: String,
        default: "https://i.pinimg.com/736x/2c/f5/58/2cf558ab8c1f12b43f7326945672805e.jpg"
    },
    socialMedia: { type: Map, of: String, default: {} },
    about: { type: Map, of: String, default: { es: "" } },
    directiveBoard: [{ year: String, role: String }]
});

userSchema.pre("deleteOne", async function (next) {
    const user = await this.model.findOne(this.getQuery());
    if (user) {
        await Post.updateMany(
            { "authors.user_id": user._id },
            { $pull: { authors: { user_id: user._id } } }
        );
    }
    next();
});

export const User = model<UserDocument>("User", userSchema);
