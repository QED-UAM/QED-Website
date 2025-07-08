import dotenv from "dotenv";

dotenv.config();

const PORT: number = parseInt(process.env.PORT || "3000");
const MAX_WORKERS: number = parseInt(process.env.MAX_WORKERS || "10");
const MONGODB_URI: string = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/qed";
const GOOGLE_CLIENT_ID: string = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET: string = process.env.GOOGLE_CLIENT_SECRET || "";
const COOKIE_SESSION_KEY1: string = process.env.COOKIE_SESSION_KEY1 || "";
const COOKIE_SESSION_KEY2: string = process.env.COOKIE_SESSION_KEY2 || "";
const QED_EMAIL: string = process.env.QED_EMAIL || "qed.uam@gmail.com";
const SUPPORTED_LANGUAGES: string[] = process.env.SUPPORTED_LANGUAGES?.replace(", ", ",").split(
    ","
) || ["es", "en"];
const MAILGUN_KEY: string = process.env.MAILGUN_KEY || "";
const MAILGUN_DOMAIN: string = process.env.MAILGUN_DOMAIN || "";

export {
    PORT,
    MAX_WORKERS,
    MONGODB_URI,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    COOKIE_SESSION_KEY1,
    COOKIE_SESSION_KEY2,
    QED_EMAIL,
    SUPPORTED_LANGUAGES,
    MAILGUN_KEY,
    MAILGUN_DOMAIN
};
