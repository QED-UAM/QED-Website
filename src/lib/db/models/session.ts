import mongoose, { Schema, type Model, type Types } from "mongoose";

// Admin sessions, stored in the same `sessions` collection connect-mongo used. The TTL index
// on `expires` has the same specification as connect-mongo's, so it is reused as-is.
// `_id` is the SHA-256 of the session token; the raw token only lives in the cookie.
export interface SessionDoc {
    _id: string;
    admin_id: Types.ObjectId;
    expires: Date;
}

const sessionSchema = new Schema(
    {
        _id: { type: String, required: true },
        admin_id: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
        expires: { type: Date, required: true, index: { expires: 0 } }
    },
    { versionKey: false }
);

export const Session: Model<SessionDoc> =
    (mongoose.models.Session as Model<SessionDoc>) ??
    mongoose.model<SessionDoc>("Session", sessionSchema as Schema<SessionDoc>, "sessions");
