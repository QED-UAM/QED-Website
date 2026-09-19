import type { APIRoute } from "astro";
import { href } from "../lib/i18n/routes";
import { rateLimited, sendContactMessage, validateContact } from "../lib/email/contact";

// The previous contact form posted here, and browsers may still have that page cached.
// Handle the message the same way the new contact page does.
export const POST: APIRoute = async ({ request, locals, redirect, clientAddress }) => {
    const form = await request.formData();
    const contact = href(locals.locale, "contact");
    const result = validateContact({ name: form.get("name"), email: form.get("email"), message: form.get("message") });
    const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || clientAddress || "unknown";
    if (!result.ok || rateLimited(client)) return redirect(contact, 303);
    return (await sendContactMessage(result.value))
        ? redirect(href(locals.locale, "emailSuccessful"), 303)
        : redirect(contact, 303);
};
