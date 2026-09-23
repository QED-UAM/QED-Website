// Read queries for the public pages. They replace the old aggregation pipelines with plain
// queries assembled in TypeScript, keeping the same rules:
//  - multilingual fields fall back to Spanish and report when a translation is missing
//  - only visible magazines (and their posts) are public
//  - an issue lists, in each language, only the posts that have content in that language
import mongoose from "mongoose";
import {
    Activity,
    Magazine,
    News,
    Post,
    User,
    type DirectiveBoardEntry,
    type MagazineDoc,
    type PostDoc,
    type UserDoc
} from "./db/models";
import { localize, longDate, schoolYear, shortDate, MAIN_BOARD_ROLES, type Localized } from "./format";
import { parseMD } from "./markdown";
import { DEFAULT_AVATAR, PLACEHOLDER_IMAGE } from "./config";

// ---------------------------------------------------------------- home

export interface NewsView {
    url: string;
    title: Localized;
    descriptionHtml: string;
    missing: boolean;
}

export async function getNews(lang: string): Promise<NewsView | null> {
    const news = await News.findOne().lean();
    if (!news) return null;
    const title = localize(news.title, lang);
    const description = localize(news.description, lang);
    if (!title.value && !description.value) return null;
    return {
        url: news.url,
        title,
        descriptionHtml: description.value ? parseMD(description.value, { locale: lang }) : "",
        missing: title.missing || description.missing
    };
}

// ---------------------------------------------------------------- magazine

export interface MagazineCard {
    url: string;
    cover: string;
    title: Localized;
}

function toCard(magazine: MagazineDoc, lang: string): MagazineCard {
    return {
        url: magazine.url,
        cover: magazine.cover || PLACEHOLDER_IMAGE,
        title: localize(magazine.title, lang)
    };
}

/** Visible issues, newest first. */
export async function listMagazines(lang: string): Promise<MagazineCard[]> {
    const magazines = await Magazine.find({ visible: true }).sort({ _id: -1 }).lean();
    return magazines.map((magazine) => toCard(magazine, lang));
}

export async function latestMagazine(lang: string): Promise<MagazineCard | null> {
    const magazine = await Magazine.findOne({ visible: true }).sort({ _id: -1 }).lean();
    return magazine ? toCard(magazine, lang) : null;
}

export interface PostSummary {
    url: string;
    title: string;
    description: string;
    type: string;
}

export interface IssueView extends MagazineCard {
    descriptionHtml: string;
    /** Posts grouped by type: "post" (no category) first, then in order of appearance. */
    sections: { type: string; posts: PostSummary[] }[];
}

export async function getIssue(url: string, lang: string): Promise<IssueView | null> {
    const magazine = await Magazine.findOne({ url, visible: true }).lean();
    if (!magazine) return null;

    const posts = await Post.find({ magazine_id: magazine._id }).sort({ _id: 1 }).lean();
    const sections = new Map<string, PostSummary[]>([["post", []]]);
    for (const post of posts) {
        if (localize(post.content, lang).missing) continue;
        const type = post.type || "post";
        if (!sections.has(type)) sections.set(type, []);
        sections.get(type)!.push({
            url: post.url,
            title: localize(post.title, lang).value,
            description: localize(post.description, lang).value,
            type
        });
    }

    return {
        ...toCard(magazine, lang),
        descriptionHtml: parseMD(localize(magazine.description, lang).value, { locale: lang }),
        sections: [...sections]
            .filter(([, list]) => list.length > 0)
            .map(([type, list]) => ({ type, posts: list }))
    };
}

export interface AuthorView {
    url: string;
    name: string;
    photo: string;
    role: string;
}

export interface ArticleView {
    url: string;
    title: string;
    description: string;
    contentHtml: string;
    scripts: string;
    type: string;
    views: number;
    missing: boolean;
    createdAt: Date;
    updatedAt: Date;
    authors: AuthorView[];
    magazine: { url: string; title: string };
}

async function authorsOf(post: Pick<PostDoc, "authors">): Promise<AuthorView[]> {
    const ids = (post.authors ?? []).map((author) => author.user_id);
    if (ids.length === 0) return [];
    const users = await User.find({ _id: { $in: ids } }).lean();
    const byId = new Map(users.map((user) => [user._id.toString(), user]));
    return post.authors.flatMap((author) => {
        const user = byId.get(author.user_id.toString());
        return user
            ? [{ url: user.url, name: user.name ?? "", photo: user.photo || DEFAULT_AVATAR, role: author.role }]
            : [];
    });
}

export async function getArticle(url: string, lang: string): Promise<ArticleView | null> {
    const post = await Post.findOne({ url }).lean();
    if (!post?.magazine_id) return null;
    const magazine = await Magazine.findById(post.magazine_id).lean();
    if (!magazine?.visible) return null;

    const content = localize(post.content, lang);
    const createdAt = post._id.getTimestamp();
    return {
        url: post.url,
        title: localize(post.title, lang).value,
        description: localize(post.description, lang).value,
        contentHtml: parseMD(content.value, { locale: lang }),
        scripts: post.scripts ?? "",
        type: post.type || "post",
        views: post.views ?? 0,
        missing: content.missing,
        createdAt,
        updatedAt: post.updated_at ?? createdAt,
        authors: await authorsOf(post),
        magazine: { url: magazine.url, title: localize(magazine.title, lang).value }
    };
}

/** Atomic view counter. Returns false when the post doesn't exist. */
export async function incrementViews(url: string): Promise<boolean> {
    const result = await Post.updateOne({ url }, { $inc: { views: 1 } });
    return result.matchedCount > 0;
}

// ---------------------------------------------------------------- activities

export const ACTIVITIES_PER_PAGE = 5;

export interface ActivitySummary {
    url: string;
    photo: string | null;
    title: Localized;
    descriptionHtml: string;
    date: string;
    isoDate: string;
}

export async function listActivities(
    lang: string,
    requestedPage: number
): Promise<{ activities: ActivitySummary[]; page: number; totalPages: number }> {
    const total = await Activity.countDocuments();
    const totalPages = Math.ceil(total / ACTIVITIES_PER_PAGE);
    let page = Math.max(Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1, 1);
    if (page > totalPages && totalPages > 0) page = 1;

    const activities = await Activity.find()
        .sort({ created_at: -1 })
        .skip((page - 1) * ACTIVITIES_PER_PAGE)
        .limit(ACTIVITIES_PER_PAGE)
        .lean();

    return {
        page,
        totalPages,
        activities: activities.map((activity) => ({
            url: activity.url,
            photo: activity.photo && activity.photo !== PLACEHOLDER_IMAGE ? activity.photo : null,
            title: localize(activity.title, lang),
            descriptionHtml: parseMD(localize(activity.description, lang).value, { locale: lang }),
            date: shortDate(activity.created_at),
            isoDate: activity.created_at.toISOString()
        }))
    };
}

export interface ActivityView {
    url: string;
    title: string;
    photo: string | null;
    description: string;
    contentHtml: string;
    scripts: string;
    missing: boolean;
    date: string;
    isoDate: string;
}

export async function getActivity(url: string, lang: string): Promise<ActivityView | null> {
    const activity = await Activity.findOne({ url }).lean();
    if (!activity) return null;
    const title = localize(activity.title, lang);
    return {
        url: activity.url,
        title: title.value,
        photo: activity.photo && activity.photo !== PLACEHOLDER_IMAGE ? activity.photo : null,
        description: localize(activity.description, lang).value,
        contentHtml: parseMD(localize(activity.content, lang).value, { locale: lang }),
        scripts: activity.scripts ?? "",
        missing: title.missing,
        date: longDate(activity.created_at, lang),
        isoDate: activity.created_at.toISOString()
    };
}

// ---------------------------------------------------------------- people

export interface CollaborationView {
    url: string;
    title: string;
    description: string;
    role: string;
    magazineTitle: string | null;
    showMagazineTitle: boolean;
    missing: boolean;
}

export interface ProfileView {
    url: string;
    name: string;
    photo: string;
    socialMedia: Record<string, string>;
    aboutHtml: string;
    directiveBoard: DirectiveBoardEntry[];
    currentRole: string | null;
    collaborations: CollaborationView[];
}

export async function getProfile(url: string, lang: string): Promise<ProfileView | null> {
    const user = await User.findOne({ url }).lean();
    if (!user) return null;

    const posts = await Post.find({ "authors.user_id": user._id })
        .select("title url description authors magazine_id")
        .sort({ _id: 1 })
        .lean();
    const magazineIds = posts.map((post) => post.magazine_id).filter(Boolean) as mongoose.Types.ObjectId[];
    const magazines = await Magazine.find({ _id: { $in: magazineIds }, visible: true }).lean();
    const magazineById = new Map(magazines.map((magazine) => [magazine._id.toString(), magazine]));
    const published = posts.filter((post) => post.magazine_id && magazineById.has(post.magazine_id.toString()));

    const titleOf = (post: (typeof published)[number]) => post.title?.[lang] || post.title?.es || "";
    const titleCounts = new Map<string, number>();
    for (const post of published) titleCounts.set(titleOf(post), (titleCounts.get(titleOf(post)) ?? 0) + 1);

    const year = schoolYear();
    const board = user.directiveBoard ?? [];
    return {
        url: user.url,
        name: user.name ?? "",
        photo: user.photo || DEFAULT_AVATAR,
        socialMedia: user.socialMedia ?? {},
        aboutHtml: parseMD(user.about?.[lang] || user.about?.es || "", { locale: lang }),
        directiveBoard: board,
        currentRole: board.find((entry) => entry.year === year)?.role ?? null,
        collaborations: published.map((post) => {
            const magazine = magazineById.get(post.magazine_id!.toString())!;
            return {
                url: post.url,
                title: titleOf(post),
                description: post.description?.[lang] || post.description?.es || "",
                role: post.authors.find((author) => author.user_id.toString() === user._id.toString())?.role ?? "",
                magazineTitle: magazine.title?.[lang] || magazine.title?.es || null,
                showMagazineTitle: (titleCounts.get(titleOf(post)) ?? 0) > 1,
                missing: !post.title?.[lang]
            };
        })
    };
}

export interface BoardMember {
    url: string;
    name: string;
    photo: string;
    role: string | null;
}

/** Current directive board: main roles in fixed order, then everyone else alphabetically. */
export async function getBoard(): Promise<{ year: string; main: BoardMember[]; others: BoardMember[] }> {
    // At the start of a school year the new board may not be entered yet: show the latest one.
    const current = schoolYear();
    const years = (await User.distinct("directiveBoard.year")).filter(
        (year): year is string => typeof year === "string" && year <= current
    );
    const year = years.includes(current) ? current : (years.sort().at(-1) ?? current);
    const users: UserDoc[] = await User.find({ "directiveBoard.year": year }).lean();
    const members = users.map((user) => ({
        url: user.url,
        name: user.name ?? "",
        photo: user.photo || DEFAULT_AVATAR,
        role: user.directiveBoard?.find((entry) => entry.year === year)?.role ?? null
    }));
    const mainRoles = MAIN_BOARD_ROLES as readonly string[];
    const main = members
        .filter((member) => member.role && mainRoles.includes(member.role))
        .sort((a, b) => mainRoles.indexOf(a.role!) - mainRoles.indexOf(b.role!));
    const others = members
        .filter((member) => !main.includes(member))
        .sort((a, b) => a.name.localeCompare(b.name));
    return { year, main, others };
}
