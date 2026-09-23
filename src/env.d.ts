/// <reference types="astro/client" />

declare namespace App {
    interface Locals {
        /** Language used to render this request ("es" by default). */
        locale: string;
        /** Logged-in admin, when there is one. */
        admin: import("./lib/db/models").AdminDoc | null;
        /** Localized route matched for this request, if any. */
        route?: import("./lib/i18n/routes").RouteMatch;
        /** Pathname as requested by the browser, before localized-route rewriting. */
        originalPath: string;
    }
}
