import type { APIRoute } from "astro";
import { incrementViews } from "../../../../lib/content";

export const POST: APIRoute = async ({ params, locals }) => {
    // Localized URLs reach this endpoint through a middleware rewrite, which doesn't carry the
    // route params over to endpoints; the middleware keeps them in `locals.route`.
    const url = locals.route?.params.url ?? params.url ?? "";
    const found = await incrementViews(url);
    return new Response(null, { status: found ? 200 : 404 });
};
