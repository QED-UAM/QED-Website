import type { APIRoute } from "astro";
import { OAuth2RequestError, decodeIdToken } from "arctic";
import { GOOGLE_STATE_COOKIE, GOOGLE_VERIFIER_COOKIE, adminFromIdToken, googleClient } from "../../../lib/auth/google";
import { createSession } from "../../../lib/auth/session";

const fail = (redirect: (path: string, status: 302) => Response, reason: string, detail: string) => {
    console.warn(`[auth] Google login failed (${reason}): ${detail}`);
    return redirect(`/auth/error?reason=${reason}`, 302);
};

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const storedState = cookies.get(GOOGLE_STATE_COOKIE)?.value;
    const verifier = cookies.get(GOOGLE_VERIFIER_COOKIE)?.value;
    cookies.delete(GOOGLE_STATE_COOKIE, { path: "/" });
    cookies.delete(GOOGLE_VERIFIER_COOKIE, { path: "/" });

    if (url.searchParams.get("error")) return fail(redirect, "google", String(url.searchParams.get("error")));
    if (!code || !state || !storedState || !verifier || state !== storedState) {
        return fail(
            redirect,
            "state",
            `missing or mismatched state (cookie ${storedState ? "present" : "missing"}); ` +
                `start the login and finish it on the same host (${url.host})`
        );
    }

    try {
        const tokens = await googleClient(url).validateAuthorizationCode(code, verifier);
        const admin = await adminFromIdToken(tokens.idToken());
        // Only existing admins (or QED_EMAIL on its first login) can sign in.
        if (!admin) {
            const email = (decodeIdToken(tokens.idToken()) as { email?: string }).email ?? "unknown";
            return fail(redirect, "notAdmin", `${email} is not in the admin list and isn't QED_EMAIL`);
        }
        await createSession(cookies, admin);
        return redirect("/admin", 302);
    } catch (error) {
        const detail =
            error instanceof OAuth2RequestError
                ? `${error.code}${error.description ? `: ${error.description}` : ""} (check GOOGLE_CLIENT_SECRET and the redirect URI)`
                : (error as Error).message;
        if (!(error instanceof OAuth2RequestError)) console.error(error);
        return fail(redirect, "google", detail);
    }
};
