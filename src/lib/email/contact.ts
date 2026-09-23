import { Resend } from "resend";
import { config } from "../config";
import { escapeHTML } from "../markdown";

export interface ContactMessage {
    name: string;
    email: string;
    message: string;
}

export type ContactError = "required" | "email" | "rateLimited" | "send";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(input: Partial<Record<keyof ContactMessage, unknown>>):
    | { ok: true; value: ContactMessage }
    | { ok: false; error: ContactError } {
    const name = String(input.name ?? "").trim().slice(0, 200);
    const email = String(input.email ?? "").trim().slice(0, 320);
    const message = String(input.message ?? "").trim().slice(0, 10000);
    if (!name || !email || !message) return { ok: false, error: "required" };
    if (!EMAIL.test(email)) return { ok: false, error: "email" };
    return { ok: true, value: { name, email, message } };
}

// Per-client limit: 5 messages every 10 minutes (single process, so in memory is enough).
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 5;
const recent = new Map<string, number[]>();

export function rateLimited(client: string): boolean {
    const now = Date.now();
    const times = (recent.get(client) ?? []).filter((time) => now - time < WINDOW_MS);
    if (times.length >= LIMIT) {
        recent.set(client, times);
        return true;
    }
    times.push(now);
    recent.set(client, times);
    if (recent.size > 5000) recent.clear();
    return false;
}

function render({ name, email, message }: ContactMessage) {
    const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px;background:#f7f8fb;font-family:Arial,Helvetica,sans-serif;color:#1c1f26">
  <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #dde4f2;border-radius:12px">
    <tr><td style="padding:24px 28px;border-bottom:3px solid #f2a14d">
      <strong style="font-size:18px;color:#1d3b9c">Nuevo mensaje desde la web de QED</strong>
    </td></tr>
    <tr><td style="padding:20px 28px;font-size:15px;line-height:1.5">
      <p style="margin:0 0 4px"><strong>Nombre:</strong> ${escapeHTML(name)}</p>
      <p style="margin:0 0 16px"><strong>Correo:</strong> <a href="mailto:${escapeHTML(email)}">${escapeHTML(email)}</a></p>
      <div style="white-space:pre-wrap;padding:16px;background:#f7f8fb;border-radius:8px">${escapeHTML(message)}</div>
      <p style="margin:16px 0 0;color:#5b6275;font-size:13px">Responde a este correo para contestar directamente a ${escapeHTML(name)}.</p>
    </td></tr>
  </table>
</body>
</html>`;
    const text = `Nuevo mensaje desde la web de QED\n\nNombre: ${name}\nCorreo: ${email}\n\n${message}\n`;
    return { html, text };
}

/**
 * Sends a contact-form message to QED through Resend, with Reply-To set to the sender.
 * Without RESEND_API_KEY (development, tests) the message is logged instead.
 */
export async function sendContactMessage(message: ContactMessage): Promise<boolean> {
    const { html, text } = render(message);
    const subject = `Contacto web: ${message.name}`;

    if (!config.resendApiKey) {
        console.info(`[contact] RESEND_API_KEY not set; message not sent.\n${text}`);
        return true;
    }

    const resend = new Resend(config.resendApiKey);
    const { error } = await resend.emails.send({
        from: config.contactFromEmail,
        to: config.contactToEmail,
        replyTo: `${message.name.replace(/[<>"]/g, "")} <${message.email}>`,
        subject,
        html,
        text
    });
    if (error) {
        console.error("[contact] Resend error", error);
        return false;
    }
    return true;
}
