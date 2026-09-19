import mongoose, { Schema, type Model, type Types } from "mongoose";
import type { LocalizedText } from "./types";

export interface ActivityDoc {
    _id: Types.ObjectId;
    url: string;
    title: LocalizedText;
    description: LocalizedText;
    photo?: string;
    scripts?: string;
    content: LocalizedText;
    created_at: Date;
}

const activitySchema = new Schema({
    url: { type: String, required: true, unique: true },
    title: { type: Map, of: String, required: true },
    description: { type: Map, of: String, required: true },
    photo: { type: String },
    scripts: { type: String },
    content: { type: Map, of: String, required: true },
    created_at: { type: Date, default: Date.now }
});

export const Activity: Model<ActivityDoc> =
    (mongoose.models.Activity as Model<ActivityDoc>) ??
    mongoose.model<ActivityDoc>("Activity", activitySchema as Schema<ActivityDoc>, "activities");
