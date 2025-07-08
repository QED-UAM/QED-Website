import { Schema, model, Document } from "mongoose";

interface AdminDocument extends Document {
    email: string;
    name: string;
    photo: string;
}

const adminSchema = new Schema<AdminDocument>(
    {
        email: { type: String, required: true, unique: true },
        name: { type: String },
        photo: { type: String }
    },
    { versionKey: false }
);

export const Admin = model<AdminDocument>("Admin", adminSchema);
