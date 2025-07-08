import { Schema, model, Document } from "mongoose";

interface ActivityDocument extends Document {
    url: string;
    title: { [key: string]: string };
    description: { [key: string]: string };
    photo: string;
    scripts: string;
    content: { [key: string]: string };
    created_at: Date;
}

const activitySchema = new Schema<ActivityDocument>({
    url: { type: String, required: true, unique: true },
    title: { type: Map, of: String, required: true },
    description: { type: Map, of: String, required: true },
    photo: { type: String },
    scripts: { type: String },
    content: { type: Map, of: String, required: true },
    created_at: { type: Date, default: Date.now }
});

export const Activity = model<ActivityDocument>("Activity", activitySchema);
