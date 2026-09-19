import type { APIRoute } from "astro";
import { isDatabaseConnected } from "../../lib/db/connection";

// Used by the Docker HEALTHCHECK and by the offline pages to know when the site is back.
// Healthy only when the database is reachable, since no page works without it.
export const GET: APIRoute = () =>
    new Response(null, {
        status: isDatabaseConnected() ? 200 : 503,
        headers: { "Cache-Control": "no-store" }
    });
