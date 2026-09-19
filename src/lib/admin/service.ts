// Admin operations: validation and persistence for everything the admin panel edits.
// Same rules as the previous Express handlers (URL format, languages, roles, post types,
// email format, directive-board years), expressed once and shared by the Astro actions.
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { Activity, Admin, Magazine, News, Post, User, type LocalizedText } from "../db/models";
import { destroyAdminSessions } from "../auth/session";
import { hasKey, supportedLocales, tMap } from "../i18n";
import { config, DEFAULT_LOCALE } from "../config";

/** A validation problem, as a translation key under `admin.errors` plus interpolation values. */
export interface Problem {
    key: string;
    vars?: Record<string, string>;
}

export class AdminError extends Error {
    constructor(public problems: Problem[]) {
        super(problems.map((problem) => problem.key).join(", "));
    }
}

const URL_PATTERN = /^[a-zA-Z0-9_-]{4,}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const YEAR_PATTERN = /^(\d{4})-(\d{2})$/;

type Localized = Record<string, unknown> | undefined | null;

/** Keeps supported languages with text; Spanish is always kept (it's the fallback). */
export function cleanLocalized(value: Localized): LocalizedText {
    const result: LocalizedText = {};
    for (const lang of supportedLocales()) {
        const text = typeof value?.[lang] === "string" ? (value[lang] as string).trim() : "";
        if (text !== "" || lang === DEFAULT_LOCALE) result[lang] = text;
    }
    if (!(DEFAULT_LOCALE in result)) result[DEFAULT_LOCALE] = "";
    return result;
}

function checkUrl(url: unknown, problems: Problem[]): string {
    const value = typeof url === "string" ? url.trim() : "";
    if (!URL_PATTERN.test(value)) problems.push({ key: "url" });
    return value;
}

function fail(problems: Problem[]) {
    if (problems.length > 0) throw new AdminError(problems);
}

function isDuplicateKey(error: unknown): boolean {
    return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

async function guardDuplicates<T>(work: () => Promise<T>): Promise<T> {
    try {
        return await work();
    } catch (error) {
        if (isDuplicateKey(error)) throw new AdminError([{ key: "urlTaken" }]);
        throw error;
    }
}

const str = (value: unknown) => (typeof value === "string" ? value : "");

// ---------------------------------------------------------------- accounts

export async function saveAdmins(emails: unknown): Promise<string[]> {
    const list = Array.isArray(emails) ? emails.map((email) => str(email).trim()).filter(Boolean) : [];
    const problems: Problem[] = [];
    for (const email of list) if (!EMAIL_PATTERN.test(email)) problems.push({ key: "email", vars: { email } });
    fail(problems);

    const wanted = [...new Set([...list, config.qedEmail])];
    const existing = await Admin.find().select("email").lean();
    const existingEmails = existing.map((admin) => admin.email);
    const toAdd = wanted.filter((email) => !existingEmails.includes(email));
    const toRemove = existing.filter((admin) => !wanted.includes(admin.email) && admin.email !== config.qedEmail);

    await Promise.all(toAdd.map((email) => Admin.create({ email })));
    for (const admin of toRemove) {
        await Admin.deleteOne({ _id: admin._id });
        await destroyAdminSessions(admin._id);
    }
    return wanted;
}

// ---------------------------------------------------------------- profiles

export const SOCIAL_NETWORKS = ["email", "instagram", "x", "linkedin"] as const;

export function boardYears(now = new Date()): string[] {
    const years: string[] = [];
    for (let year = 2021; year <= now.getFullYear(); year++) years.push(`${year}-${String(year + 1).slice(-2)}`);
    return years;
}

export interface ProfileInput {
    url: unknown;
    name: unknown;
    photo: unknown;
    socialMedia?: Record<string, unknown>;
    about?: Localized;
    directiveBoard: unknown;
}

export async function createProfile(): Promise<string> {
    const url = randomUUID();
    await User.create({ url, name: "", photo: "", socialMedia: {}, about: { es: "" } });
    return url;
}

export async function saveProfile(currentUrl: string, input: ProfileInput): Promise<string> {
    const problems: Problem[] = [];
    const url = checkUrl(input.url, problems);

    const socialMedia: Record<string, string> = {};
    for (const network of SOCIAL_NETWORKS) {
        const value = str(input.socialMedia?.[network]).trim();
        if (!value) continue;
        if (network === "email" && !EMAIL_PATTERN.test(value)) problems.push({ key: "email", vars: { email: value } });
        else socialMedia[network] = value;
    }

    const roles = Object.keys(tMap(DEFAULT_LOCALE, "admin.directiveBoard.roles"));
    const board = Array.isArray(input.directiveBoard) ? input.directiveBoard : [];
    const directiveBoard: { year: string; role: string }[] = [];
    const seen = new Set<string>();
    for (const entry of board) {
        const year = str(entry?.year);
        const role = str(entry?.role);
        if (!YEAR_PATTERN.test(year)) problems.push({ key: "invalidYear", vars: { year } });
        else if (seen.has(year)) problems.push({ key: "duplicateYear", vars: { year } });
        else if (!roles.includes(role)) problems.push({ key: "invalidRole", vars: { role } });
        else {
            seen.add(year);
            directiveBoard.push({ year, role });
        }
    }
    fail(problems);

    const exists = await User.exists({ url: currentUrl });
    if (!exists) throw new AdminError([{ key: "notFound" }]);
    await guardDuplicates(() =>
        User.updateOne(
            { url: currentUrl },
            {
                url,
                name: str(input.name).trim(),
                photo: str(input.photo).trim(),
                socialMedia,
                about: cleanLocalized(input.about),
                directiveBoard
            }
        )
    );
    return url;
}

export async function deleteProfile(url: string): Promise<boolean> {
    return (await User.deleteOne({ url })).deletedCount > 0;
}

// ---------------------------------------------------------------- magazines

export interface MagazineInput {
    url: unknown;
    title?: Localized;
    cover: unknown;
    visible: unknown;
    description?: Localized;
}

export async function createMagazine(): Promise<string> {
    const url = randomUUID();
    await Magazine.create({ url, title: { es: "" }, cover: "", visible: false, description: { es: "" } });
    return url;
}

export async function saveMagazine(currentUrl: string, input: MagazineInput): Promise<string> {
    const problems: Problem[] = [];
    const url = checkUrl(input.url, problems);
    fail(problems);
    if (!(await Magazine.exists({ url: currentUrl }))) throw new AdminError([{ key: "notFound" }]);
    await guardDuplicates(() =>
        Magazine.updateOne(
            { url: currentUrl },
            {
                url,
                title: cleanLocalized(input.title),
                cover: str(input.cover).trim(),
                visible: input.visible === true,
                description: cleanLocalized(input.description)
            }
        )
    );
    return url;
}

export async function deleteMagazine(url: string): Promise<boolean> {
    return (await Magazine.deleteOne({ url })).deletedCount > 0;
}

// ---------------------------------------------------------------- posts

export interface PostInput {
    url: unknown;
    title?: Localized;
    description?: Localized;
    scripts: unknown;
    content?: Localized;
    authors: unknown;
    magazine_id: unknown;
    type: unknown;
}

export async function createPost(): Promise<string> {
    const url = randomUUID();
    await Post.create({
        url,
        title: { es: "" },
        description: { es: "" },
        scripts: "",
        content: { es: "" },
        tags: [],
        authors: []
    });
    return url;
}

export async function savePost(currentUrl: string, input: PostInput): Promise<string> {
    const problems: Problem[] = [];
    const url = checkUrl(input.url, problems);

    const type = str(input.type) || "post";
    if (!hasKey(`postTypes.${type}`)) problems.push({ key: "invalidType", vars: { type } });

    const roles = Object.keys(tMap(DEFAULT_LOCALE, "roles"));
    const authors: { user_id: mongoose.Types.ObjectId; role: string }[] = [];
    if (!Array.isArray(input.authors)) problems.push({ key: "invalidAuthors" });
    else {
        for (const author of input.authors) {
            const id = str(author?.user_id);
            const role = str(author?.role);
            if (!mongoose.Types.ObjectId.isValid(id)) problems.push({ key: "invalidAuthor", vars: { id } });
            else if (!(await User.exists({ _id: id }))) problems.push({ key: "invalidAuthor", vars: { id } });
            else if (!roles.includes(role)) problems.push({ key: "invalidRole", vars: { role } });
            else if (!authors.some((existing) => existing.user_id.toString() === id))
                authors.push({ user_id: new mongoose.Types.ObjectId(id), role });
        }
    }

    const magazineId = str(input.magazine_id);
    if (magazineId && !mongoose.Types.ObjectId.isValid(magazineId)) problems.push({ key: "invalidMagazine" });
    fail(problems);

    if (!(await Post.exists({ url: currentUrl }))) throw new AdminError([{ key: "notFound" }]);
    // `tags` is left untouched: the tag system was removed, existing values are preserved.
    await guardDuplicates(() =>
        Post.updateOne(
            { url: currentUrl },
            {
                url,
                title: cleanLocalized(input.title),
                description: cleanLocalized(input.description),
                scripts: str(input.scripts),
                content: cleanLocalized(input.content),
                authors,
                magazine_id: magazineId ? new mongoose.Types.ObjectId(magazineId) : null,
                type,
                updated_at: new Date()
            }
        )
    );
    return url;
}

export async function deletePost(url: string): Promise<boolean> {
    return (await Post.deleteOne({ url })).deletedCount > 0;
}

// ---------------------------------------------------------------- activities

export interface ActivityInput {
    url: unknown;
    title?: Localized;
    description?: Localized;
    photo: unknown;
    scripts: unknown;
    content?: Localized;
}

export async function createActivity(): Promise<string> {
    const url = randomUUID();
    await Activity.create({
        url,
        title: { es: "" },
        description: { es: "" },
        photo: "",
        scripts: "",
        content: { es: "" }
    });
    return url;
}

export async function saveActivity(currentUrl: string, input: ActivityInput): Promise<string> {
    const problems: Problem[] = [];
    const url = checkUrl(input.url, problems);
    fail(problems);
    if (!(await Activity.exists({ url: currentUrl }))) throw new AdminError([{ key: "notFound" }]);
    await guardDuplicates(() =>
        Activity.updateOne(
            { url: currentUrl },
            {
                url,
                title: cleanLocalized(input.title),
                description: cleanLocalized(input.description),
                photo: str(input.photo).trim(),
                scripts: str(input.scripts),
                content: cleanLocalized(input.content)
            }
        )
    );
    return url;
}

export async function deleteActivity(url: string): Promise<boolean> {
    return (await Activity.deleteOne({ url })).deletedCount > 0;
}

// ---------------------------------------------------------------- news

export interface NewsInput {
    url: unknown;
    title?: Localized;
    description?: Localized;
}

/** Upserts the single news item; clearing the Spanish title and description removes it. */
export async function saveNews(input: NewsInput): Promise<"saved" | "deleted"> {
    const title = cleanLocalized(input.title);
    const description = cleanLocalized(input.description);
    if (title.es === "" && description.es === "") {
        await News.deleteMany({});
        return "deleted";
    }
    await News.updateOne({}, { url: str(input.url).trim(), title, description }, { upsert: true });
    return "saved";
}
