import type { APIRoute } from "astro";
import { generateCodeVerifier, generateState } from "arctic";
import { GOOGLE_STATE_COOKIE, GOOGLE_VERIFIER_COOKIE, googleClient } from "../../../lib/auth/google";
import { config } from "../../../lib/config";

export const GET: APIRoute = ({ url, cookies, locals, redirect }) => {
    if (locals.admin) return redirect("/admin", 302);

    const state = generateState();
    const verifier = generateCodeVerifier();
    const options = {
        path: "/",
        httpOnly: true,
        secure: config.isProduction,
        sameSite: "lax" as const,
        maxAge: 60 * 10
    };
    cookies.set(GOOGLE_STATE_COOKIE, state, options);
    cookies.set(GOOGLE_VERIFIER_COOKIE, verifier, options);

    const authorization = googleClient(url).createAuthorizationURL(state, verifier, ["openid", "profile", "email"]);
    authorization.searchParams.set("prompt", "select_account");
    return redirect(authorization.toString(), 302);
};
