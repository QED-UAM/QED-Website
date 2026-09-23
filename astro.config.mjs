// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import svelte from "@astrojs/svelte";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    output: "server",
    adapter: node({ mode: "standalone" }),
    integrations: [svelte()],
    // Keep whitespace between inline elements (EJS-like behavior); Astro 7 defaults to "jsx".
    compressHTML: true,
    trailingSlash: "ignore",
    // Rejects cross-site form posts; replaces the deprecated csurf middleware.
    security: { checkOrigin: true },
    server: { port: Number(process.env.PORT ?? 3000), host: true },
    vite: {
        plugins: [tailwindcss()]
    }
});
