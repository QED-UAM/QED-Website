import { ActionError, defineAction, type ActionAPIContext } from "astro:actions";
import { z } from "astro/zod";
import * as admin from "../lib/admin/service";
import { parseMD } from "../lib/markdown";
import { t } from "../lib/i18n";

// Admin mutations. Every action requires a logged-in admin; validation lives in
// lib/admin/service.ts and its problems are returned translated to the admin's language.

const localized = z.record(z.string(), z.string()).optional();
const loose = z.unknown();

function requireAdmin(context: ActionAPIContext) {
    if (!context.locals.admin) throw new ActionError({ code: "UNAUTHORIZED", message: "Log in again." });
}

async function run<T>(context: ActionAPIContext, work: () => Promise<T>): Promise<T> {
    requireAdmin(context);
    try {
        return await work();
    } catch (error) {
        if (error instanceof admin.AdminError) {
            const locale = context.locals.locale;
            throw new ActionError({
                code: "BAD_REQUEST",
                message: error.problems.map((problem) => t(locale, `admin.errors.${problem.key}`, problem.vars)).join("\n")
            });
        }
        throw error;
    }
}

const byUrl = z.object({ url: z.string() });

export const server = {
    admins: {
        save: defineAction({
            input: z.object({ emails: z.array(z.string()) }),
            handler: (input, context) => run(context, () => admin.saveAdmins(input.emails))
        })
    },
    profiles: {
        create: defineAction({ handler: (_input, context) => run(context, admin.createProfile) }),
        delete: defineAction({ input: byUrl, handler: (input, context) => run(context, () => admin.deleteProfile(input.url)) }),
        save: defineAction({
            input: z.object({
                currentUrl: z.string(),
                url: z.string(),
                name: z.string(),
                photo: z.string(),
                socialMedia: z.record(z.string(), z.string()).optional(),
                about: localized,
                directiveBoard: z.array(z.object({ year: z.string(), role: z.string() }))
            }),
            handler: (input, context) => run(context, () => admin.saveProfile(input.currentUrl, input))
        })
    },
    magazines: {
        create: defineAction({ handler: (_input, context) => run(context, admin.createMagazine) }),
        delete: defineAction({ input: byUrl, handler: (input, context) => run(context, () => admin.deleteMagazine(input.url)) }),
        save: defineAction({
            input: z.object({
                currentUrl: z.string(),
                url: z.string(),
                title: localized,
                cover: z.string(),
                visible: z.boolean(),
                description: localized
            }),
            handler: (input, context) => run(context, () => admin.saveMagazine(input.currentUrl, input))
        })
    },
    posts: {
        create: defineAction({ handler: (_input, context) => run(context, admin.createPost) }),
        delete: defineAction({ input: byUrl, handler: (input, context) => run(context, () => admin.deletePost(input.url)) }),
        save: defineAction({
            input: z.object({
                currentUrl: z.string(),
                url: z.string(),
                title: localized,
                description: localized,
                scripts: z.string(),
                content: localized,
                authors: z.array(z.object({ user_id: z.string(), role: z.string() })),
                magazine_id: z.string().nullable(),
                type: z.string()
            }),
            handler: (input, context) => run(context, () => admin.savePost(input.currentUrl, input))
        })
    },
    activities: {
        create: defineAction({ handler: (_input, context) => run(context, admin.createActivity) }),
        delete: defineAction({ input: byUrl, handler: (input, context) => run(context, () => admin.deleteActivity(input.url)) }),
        save: defineAction({
            input: z.object({
                currentUrl: z.string(),
                url: z.string(),
                title: localized,
                description: localized,
                photo: z.string(),
                scripts: z.string(),
                content: localized
            }),
            handler: (input, context) => run(context, () => admin.saveActivity(input.currentUrl, input))
        })
    },
    news: {
        save: defineAction({
            input: z.object({ url: z.string(), title: localized, description: localized }),
            handler: (input, context) => run(context, () => admin.saveNews(input))
        })
    },
    markdown: {
        preview: defineAction({
            input: z.object({ md: z.string(), locale: z.string().optional(), extra: loose.optional() }),
            handler: async (input, context) => {
                requireAdmin(context);
                return { html: parseMD(input.md, { locale: input.locale ?? context.locals.locale }) };
            }
        })
    }
};
