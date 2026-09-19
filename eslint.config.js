import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import svelte from "eslint-plugin-svelte";

export default tseslint.config(
    {
        ignores: [
            "dist/",
            ".astro/",
            "node_modules/",
            "tests/legacy/",
            "tests/fixtures/",
            "playwright-report/",
            "test-results/",
            "scripts/_*.tmp.*",
            // Legacy runtime loaded as-is by articles stored in the database (see docs/interactive-components.md).
            "public/js/postInteractiveElements.js",
            "public/js/postUtils.js"
        ]
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    ...astro.configs["flat/recommended"],
    // Svelte rules only for Svelte files (some of them break on plain scripts).
    ...svelte.configs.recommended.map((config) => ({ ...config, files: config.files ?? ["**/*.svelte", "**/*.svelte.ts"] })),
    {
        languageOptions: {
            globals: { ...globals.browser, ...globals.node }
        },
        rules: {
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }]
        }
    },
    {
        files: ["**/*.svelte", "**/*.svelte.ts"],
        languageOptions: {
            parserOptions: { parser: tseslint.parser, extraFileExtensions: [".svelte"] }
        }
    },
    {
        files: ["public/**/*.js"],
        languageOptions: { sourceType: "script", globals: { ...globals.browser, ...globals.serviceworker } }
    }
);
