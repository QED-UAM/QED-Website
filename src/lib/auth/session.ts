import { createHash, randomBytes } from "node:crypto";
import type { AstroCookies } from "astro";
import { Admin, Session, type AdminDoc } from "../db/models";
import { config } from "../config";

export const SESSION_COOKIE = "qed_session";
const SESSION_DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

function setCookie(cookies: AstroCookies, token: string, expires: Date) {
    cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: config.isProduction,
        path: "/",
        expires
    });
}

export async function createSession(cookies: AstroCookies, admin: Pick<AdminDoc, "_id">) {
    const token = randomBytes(32).toString("base64url");
    const expires = new Date(Date.now() + SESSION_DAYS * DAY);
    await Session.create({ _id: hash(token), admin_id: admin._id, expires });
    setCookie(cookies, token, expires);
}

/** Why the last readSession() call found no admin (for development logs). */
export let lastSessionMiss = "";

/** Returns the logged-in admin, extending the session when it is past half its lifetime. */
export async function readSession(cookies: AstroCookies): Promise<AdminDoc | null> {
    const token = cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
        lastSessionMiss = "no session cookie";
        return null;
    }

    const session = await Session.findById(hash(token)).lean();
    if (!session || session.expires.getTime() < Date.now()) {
        lastSessionMiss = session ? "session expired" : "session not found in the sessions collection";
        cookies.delete(SESSION_COOKIE, { path: "/" });
        return null;
    }

    const admin = await Admin.findById(session.admin_id).lean();
    if (!admin) {
        lastSessionMiss = "the session's admin no longer exists";
        await Session.deleteOne({ _id: session._id });
        cookies.delete(SESSION_COOKIE, { path: "/" });
        return null;
    }
    lastSessionMiss = "";

    if (session.expires.getTime() - Date.now() < (SESSION_DAYS / 2) * DAY) {
        const expires = new Date(Date.now() + SESSION_DAYS * DAY);
        await Session.updateOne({ _id: session._id }, { expires });
        setCookie(cookies, token, expires);
    }
    return admin;
}

export async function destroySession(cookies: AstroCookies) {
    const token = cookies.get(SESSION_COOKIE)?.value;
    if (token) await Session.deleteOne({ _id: hash(token) });
    cookies.delete(SESSION_COOKIE, { path: "/" });
}

/** Ends every session of an admin (used when their account is removed). */
export async function destroyAdminSessions(adminId: AdminDoc["_id"]) {
    await Session.deleteMany({ admin_id: adminId });
}
