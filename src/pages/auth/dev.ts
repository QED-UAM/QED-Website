import type { APIRoute } from "astro";
import { Admin } from "../../lib/db/models";
import { createSession } from "../../lib/auth/session";
import { config } from "../../lib/config";

// Development/test login without Google: /auth/dev?email=<existing admin>.
// Only available when AUTH_DEV_LOGIN=1 and NODE_ENV is not "production".
export const GET: APIRoute = async ({ url, cookies, redirect }) => {
    if (config.isProduction || process.env.AUTH_DEV_LOGIN !== "1") return new Response(null, { status: 404 });
    const email = url.searchParams.get("email") ?? config.qedEmail;
    const admin =
        (await Admin.findOne({ email }).lean()) ??
        (email === config.qedEmail ? (await Admin.create({ email, name: "QED" })).toObject() : null);
    if (!admin) return new Response("Unknown admin", { status: 403 });
    await createSession(cookies, admin);
    return redirect("/admin", 302);
};
