import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface AdminDoc {
    _id: Types.ObjectId;
    email: string;
    name?: string;
    photo?: string;
}

const adminSchema = new Schema(
    {
        email: { type: String, required: true, unique: true },
        name: { type: String },
        photo: { type: String }
    },
    { versionKey: false }
);

export const Admin: Model<AdminDoc> =
    (mongoose.models.Admin as Model<AdminDoc>) ??
    mongoose.model<AdminDoc>("Admin", adminSchema as Schema<AdminDoc>, "admins");
