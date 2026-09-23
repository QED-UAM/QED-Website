import { Google, decodeIdToken } from "arctic";
import { Admin, type AdminDoc } from "../db/models";
import { config, DEFAULT_AVATAR } from "../config";

export const GOOGLE_STATE_COOKIE = "google_oauth_state";
export const GOOGLE_VERIFIER_COOKIE = "google_code_verifier";

/**
 * Public origin of the site. In development it's always the request's own origin (so Google
 * sends you back to localhost even if SITE_URL is set). In production SITE_URL wins; without
 * it, the request host over https (the reverse proxy terminates TLS, so the request says http).
 */
export function siteOrigin(url: URL): string {
    if (import.meta.env.DEV) return url.origin;
    if (config.siteUrl) return config.siteUrl;
    return config.isProduction ? `https://${url.host}` : url.origin;
}

export function googleClient(url: URL): Google {
    return new Google(
        config.googleClientId,
        config.googleClientSecret,
        // Same callback path as the passport version, so the Google Console setup is unchanged.
        `${siteOrigin(url)}/auth/google/callback`
    );
}

interface GoogleClaims {
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
}

/**
 * Resolves the admin for a Google ID token. Same rules as before: existing admins get their
 * name and photo refreshed; QED_EMAIL is created on first login; anyone else is rejected.
 */
export async function adminFromIdToken(idToken: string): Promise<AdminDoc | null> {
    const claims = decodeIdToken(idToken) as GoogleClaims;
    const email = claims.email;
    if (!email || claims.email_verified === false) return null;

    const profile = { email, name: claims.name ?? "", photo: claims.picture ?? DEFAULT_AVATAR };
    const existing = await Admin.findOneAndUpdate({ email }, profile, { returnDocument: "after" }).lean();
    if (existing) return existing;

    if (email.toLowerCase() === config.qedEmail.toLowerCase()) {
        return (await Admin.create(profile)).toObject();
    }
    return null;
}
