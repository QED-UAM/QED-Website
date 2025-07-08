import { Router, Request, Response } from "express";
import getRouteTranslations from "../utils/getRouteTranslations";
import csurf from "csurf";
import { Admin } from "../models/admin";
import { QED_EMAIL } from "../config";
import { User } from "../models/user";
import { parseMD } from "../utils/mdParser";
import { v4 as uuidv4 } from "uuid";
import { __ } from "i18n";
import { Magazine } from "../models/magazine";
import { Post } from "../models/post";
import { News } from "../models/news";
import mongoose from "mongoose";
import { Activity } from "../models/activity";

const router: Router = Router();
const csrfProtection = csurf();
router.use(csrfProtection);

router.get("/", (req: Request, res: Response) => {
    res.render("admin/index");
});

// ACCOUNTS

router.get(getRouteTranslations("admin.accounts"), async (req: Request, res: Response) => {
    let admins;
    try {
        admins = await Admin.find().lean();
    } catch (err) {
        admins = [];
    }
    res.render("admin/accounts", {
        // @ts-ignore
        csrfToken: req.csrfToken(),
        admins: admins,
        // @ts-ignore
        user: req.user.email,
        QED_EMAIL: QED_EMAIL
    });
});

router.post("/accounts", csrfProtection, async (req: Request, res: Response) => {
    try {
        let admins = req.body.admins || [];
        admins.push(QED_EMAIL);
        admins = Array.from(new Set(admins));

        const existingAdmins = await Admin.find().select("email").lean();
        const existingAdminEmails = existingAdmins.map((admin: { email: string }) => admin.email);

        const emailsToAdd = admins.filter((email) => !existingAdminEmails.includes(email));
        const emailsToRemove = existingAdminEmails.filter(
            (email) => !admins.includes(email) && email !== QED_EMAIL
        );

        const addPromises = emailsToAdd.map((email) => Admin.create({ email }));
        await Promise.all(addPromises);

        const removePromises = emailsToRemove.map((email) => Admin.deleteOne({ email }));
        await Promise.all(removePromises);

        res.redirect("back");
    } catch (error) {
        console.error("Error updating admin accounts:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// PROFILES

router.get(getRouteTranslations("admin.profiles"), async (req: Request, res: Response) => {
    let profiles;
    try {
        profiles = await User.find().lean();
    } catch (err) {
        profiles = [];
    }
    res.render("admin/profiles", {
        // @ts-ignore
        csrfToken: req.csrfToken(),
        profiles: profiles
    });
});

router.post("/profiles/del", csrfProtection, async (req: Request, res: Response) => {
    try {
        const result = await User.deleteOne({ url: req.body.profile });
        if (result.deletedCount > 0) res.status(200).end();
        else res.status(404).json({ error: "User Not Found" });
    } catch (error) {
        console.error("Error deleting profile:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get(getRouteTranslations("admin.profiles", "new"), async (req: Request, res: Response) => {
    try {
        const uuid = uuidv4();
        const newUser = new User({
            url: uuid,
            name: "",
            photo: "",
            socialMedia: {},
            about: { es: "" }
        });
        await newUser.save();

        const currentPath = req.originalUrl;
        res.redirect(currentPath.substring(0, currentPath.length - 3) + uuid);
    } catch (error) {
        console.error("Error deleting profile:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get(
    getRouteTranslations("admin.profiles", ":profile"),
    async (req: Request, res: Response) => {
        try {
            const user = await User.findOne({ url: req.params.profile }).lean();
            if (!user) return res.status(404).end();

            res.render("admin/profile", {
                // @ts-ignore
                csrfToken: req.csrfToken(),
                user: { ...user, directiveBoard: user?.directiveBoard ? user.directiveBoard : [] }
            });
        } catch (error) {
            console.error("Error profile:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
);

router.post("/profiles/:profile", async (req: Request, res: Response) => {
    try {
        const errors: string[] = [];
        const { url, name, photo, socialMedia, about, directiveBoard } = req.body;
        const urlPattern = /^[a-zA-Z0-9_-]{4,}$/;
        if (!urlPattern.test(url))
            errors.push(
                "URL must be longer than 3 characters and only contain letters, numbers, underscores, and hyphens."
            );

        const sanitizedData: any = {
            url: url.trim(),
            name: name.trim(),
            photo: photo.trim(),
            socialMedia: {},
            about: {},
            directiveBoard: JSON.parse(directiveBoard || "[]")
        };

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (socialMedia)
            Object.keys(socialMedia).forEach((key) => {
                if (socialMedia[key].trim() !== "") {
                    if (key !== "email") sanitizedData.socialMedia[key] = socialMedia[key].trim();
                    else if (emailRegex.test(socialMedia[key].trim()))
                        sanitizedData.socialMedia[key] = socialMedia[key].trim();
                }
            });

        if (about)
            Object.keys(about).forEach((key) => {
                if (about[key].trim() !== "" || key === "es")
                    sanitizedData.about[key] = about[key].trim();
            });

        const user = await User.findOne({ url: req.params.profile });
        if (!user) return res.status(404).json({ errors: ["Profile not found."] });
        if (errors.length > 0) return res.status(400).json({ errors: errors });

        await User.updateOne({ url: req.params.profile }, sanitizedData);
        res.redirect(`/admin/${__("admin.profiles.url")}/${sanitizedData.url}`);
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({
            error: "Internal Server Error. Check that the new url isn't used by other profile."
        });
    }
});

// MAGAZINES

router.get(getRouteTranslations("admin.magazines"), async (req: Request, res: Response) => {
    let magazines;
    try {
        magazines = await Magazine.find().lean();
    } catch (err) {
        magazines = [];
    }
    res.render("admin/magazines", {
        // @ts-ignore
        csrfToken: req.csrfToken(),
        magazines: magazines
    });
});

router.post("/magazines/del", csrfProtection, async (req: Request, res: Response) => {
    try {
        const result = await Magazine.deleteOne({ url: req.body.magazine });
        if (result.deletedCount > 0) res.status(200).end();
        else res.status(404).json({ error: "Magazine Not Found" });
    } catch (error) {
        console.error("Error deleting magazine:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get(getRouteTranslations("admin.magazines", "new"), async (req: Request, res: Response) => {
    try {
        const uuid = uuidv4();
        const newMagazine = new Magazine({
            url: uuid,
            title: { es: "" },
            cover: "",
            visible: false,
            description: { es: "" }
        });
        await newMagazine.save();

        const currentPath = req.originalUrl;
        res.redirect(currentPath.substring(0, currentPath.length - 3) + uuid);
    } catch (error) {
        console.error("Error deleting post:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get(
    getRouteTranslations("admin.magazines", ":magazine"),
    async (req: Request, res: Response) => {
        try {
            const magazine = await Magazine.findOne({ url: req.params.magazine }).lean();
            if (!magazine) return res.status(404).end();

            res.render("admin/magazine", {
                // @ts-ignore
                csrfToken: req.csrfToken(),
                magazine: magazine
            });
        } catch (error) {
            console.error("Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
);

router.post("/magazines/:magazine", async (req: Request, res: Response) => {
    try {
        const errors: string[] = [];
        const { url, title, cover, visible, description } = req.body;
        const urlPattern = /^[a-zA-Z0-9_-]{4,}$/;
        if (!urlPattern.test(url))
            errors.push(
                "URL must be longer than 3 characters and only contain letters, numbers, underscores, and hyphens."
            );

        const sanitizedData: any = {
            url: url.trim(),
            title: {},
            cover: cover.trim(),
            visible: visible === "on",
            description: {}
        };

        if (title)
            Object.keys(title).forEach((key) => {
                if (title[key].trim() !== "" || key === "es")
                    sanitizedData.title[key] = title[key].trim();
            });

        if (description)
            Object.keys(description).forEach((key) => {
                if (description[key].trim() !== "" || key === "es")
                    sanitizedData.description[key] = description[key].trim();
            });

        const magazine = await Magazine.findOne({ url: req.params.magazine });
        if (!magazine) return res.status(404).json({ errors: ["Magazine not found."] });
        if (errors.length > 0) return res.status(400).json({ errors: errors });

        await Magazine.updateOne({ url: req.params.magazine }, sanitizedData);
        res.redirect(`/admin/${__("admin.magazines.url")}/${sanitizedData.url}`);
    } catch (error) {
        console.error("Error updating magazine:", error);
        res.status(500).json({
            error: "Internal Server Error. Check that the new url isn't used by other magazine."
        });
    }
});

// POSTS

router.get(getRouteTranslations("admin.posts"), async (req: Request, res: Response) => {
    let magazines;
    try {
        const magazineObjs = await Magazine.find().lean();
        magazines = {};
        magazineObjs.forEach(
            (magazine) => (magazines[magazine._id.toString()] = magazine.title.es)
        );
        magazines.noMagazine = "noMagazine";
    } catch (err) {
        magazines = { noMagazine: "noMagazine" };
    }
    let posts;
    try {
        posts = await Post.find().lean();
    } catch (err) {
        posts = [];
    }

    const postsByMagazine = {};
    posts.forEach((post) => {
        const magazine = magazines[post.magazine_id ? post.magazine_id.toString() : "noMagazine"];
        if (!postsByMagazine[magazine]) {
            postsByMagazine[magazine] = [];
        }
        postsByMagazine[magazine].push(post);
    });

    res.render("admin/posts", {
        // @ts-ignore
        csrfToken: req.csrfToken(),
        postsByMagazine: postsByMagazine
    });
});

router.post("/posts/del", csrfProtection, async (req: Request, res: Response) => {
    try {
        const result = await Post.deleteOne({ url: req.body.post });
        if (result.deletedCount > 0) res.status(200).end();
        else res.status(404).json({ error: "Post Not Found" });
    } catch (error) {
        console.error("Error deleting post:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get(getRouteTranslations("admin.posts", "new"), async (req: Request, res: Response) => {
    try {
        const uuid = uuidv4();
        const newPost = new Post({
            url: uuid,
            title: { es: "" },
            description: { es: "" },
            scripts: "",
            content: { es: "" },
            tags: [],
            authors: []
        });
        await newPost.save();

        const currentPath = req.originalUrl;
        res.redirect(currentPath.substring(0, currentPath.length - 3) + uuid);
    } catch (error) {
        console.error("Error deleting post:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get(getRouteTranslations("admin.posts", ":post"), async (req: Request, res: Response) => {
    try {
        const post = await Post.findOne({ url: req.params.post }).lean();
        if (!post) return res.status(404).end();

        let magazines;
        try {
            magazines = await Magazine.find().lean();
        } catch (err) {
            magazines = [];
        }

        let users;
        try {
            users = await User.find().lean();
        } catch (err) {
            users = [];
        }

        res.render("admin/post", {
            // @ts-ignore
            csrfToken: req.csrfToken(),
            post: post,
            magazines: magazines,
            users: users
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post("/posts/:post", async (req: Request, res: Response) => {
    try {
        const errors: string[] = [];
        const { url, title, description, scripts, content, tags, authors, magazine_id, type } =
            req.body;
        const urlPattern = /^[a-zA-Z0-9_-]{4,}$/;
        if (!urlPattern.test(url))
            errors.push(
                "URL must be longer than 3 characters and only contain letters, numbers, underscores, and hyphens."
            );

        if (!Object.keys(__("postTypes")).includes(type)) errors.push("Invalid post type");

        const sanitizedData: any = {
            url: url.trim(),
            title: {},
            description: {},
            scripts: scripts,
            content: {},
            tags: tags ? tags.replace(", ", ",").split(",") : [],
            authors: [],
            magazine_id: magazine_id ? magazine_id : null,
            type: type
        };

        if (title)
            Object.keys(title).forEach((key) => {
                if (title[key].trim() !== "" || key === "es") {
                    sanitizedData.title[key] = title[key].trim();
                }
            });

        if (description)
            Object.keys(description).forEach((key) => {
                if (description[key].trim() !== "" || key === "es") {
                    sanitizedData.description[key] = description[key].trim();
                }
            });

        if (content)
            Object.keys(content).forEach((key) => {
                if (content[key].trim() !== "" || key === "es") {
                    sanitizedData.content[key] = content[key].trim();
                }
            });

        let parsedAuthors;
        try {
            parsedAuthors = JSON.parse(authors);
        } catch (e) {
            errors.push("Invalid authors format");
        }

        if (parsedAuthors && Array.isArray(parsedAuthors)) {
            for (const author of parsedAuthors) {
                if (!mongoose.Types.ObjectId.isValid(author.user_id)) {
                    errors.push(`Invalid user ID: ${author.user_id}`);
                } else {
                    const userExists = await User.exists({ _id: author.user_id });
                    if (!userExists) {
                        errors.push(`User not found: ${author.user_id}`);
                    } else if (!Object.keys(__("roles")).includes(author.role)) {
                        errors.push(`Invalid role: ${author.role}`);
                    } else {
                        sanitizedData.authors.push({
                            user_id: author.user_id,
                            role: author.role
                        });
                    }
                }
            }
        } else {
            errors.push("Authors must be an array");
        }

        if (errors.length > 0) {
            return res.status(400).json({ errors: errors });
        }

        const post = await Post.findOne({ url: req.params.post });
        if (!post) {
            return res.status(404).json({ errors: ["Post not found."] });
        }

        await Post.updateOne({ url: req.params.post }, sanitizedData);
        res.redirect(`/admin/${__("admin.posts.url")}/${sanitizedData.url}`);
    } catch (error) {
        console.error("Error updating post:", error);
        res.status(500).json({
            error: "Internal Server Error. Check that the new url isn't used by another post."
        });
    }
});

// NEWS

router.get(getRouteTranslations("admin.news"), async (req: Request, res: Response) => {
    try {
        let news = await News.findOne().lean();
        // @ts-ignore
        if (!news) news = { title: { es: "" }, description: { es: "" }, url: "" };

        res.render("admin/news", {
            // @ts-ignore
            csrfToken: req.csrfToken(),
            news: news
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
router.post("/news", async (req: Request, res: Response) => {
    try {
        const { url, title, description } = req.body;

        const sanitizedData: any = {
            url: url.trim(),
            title: {},
            description: {}
        };

        if (title) {
            Object.keys(title).forEach((key) => {
                const trimmedTitle = title[key].trim();
                if (trimmedTitle !== "" || key === "es") sanitizedData.title[key] = trimmedTitle;
            });
        }

        if (description) {
            Object.keys(description).forEach((key) => {
                const trimmedDescription = description[key].trim();
                if (trimmedDescription !== "" || key === "es")
                    sanitizedData.description[key] = trimmedDescription;
            });
        }

        if (sanitizedData.title.es === "" && sanitizedData.description.es === "") {
            await News.deleteMany({});
        } else {
            await News.updateOne({}, sanitizedData, { upsert: true });
        }

        res.redirect(`/admin/${__("admin.news.url")}`);
    } catch (error) {
        console.error("Error updating news:", error);
        res.status(500).json({
            error: "Internal Server Error."
        });
    }
});

// ACTIVITIES

router.get(getRouteTranslations("admin.activities"), async (req: Request, res: Response) => {
    let activities;
    try {
        activities = await Activity.find().lean();
    } catch (err) {
        activities = [];
    }
    res.render("admin/activities", {
        // @ts-ignore
        csrfToken: req.csrfToken(),
        activities: activities
    });
});

router.post("/activities/del", csrfProtection, async (req: Request, res: Response) => {
    try {
        const result = await Activity.deleteOne({ url: req.body.activity });
        if (result.deletedCount > 0) res.status(200).end();
        else res.status(404).json({ error: "Activity Not Found" });
    } catch (error) {
        console.error("Error deleting activity:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get(getRouteTranslations("admin.activities", "new"), async (req: Request, res: Response) => {
    try {
        const uuid = uuidv4();
        const newActivity = new Activity({
            url: uuid,
            title: { es: "" },
            description: { es: "" },
            photo: "",
            scripts: "",
            content: { es: "" }
        });
        await newActivity.save();

        const currentPath = req.originalUrl;
        res.redirect(currentPath.substring(0, currentPath.length - 3) + uuid);
    } catch (error) {
        console.error("Error deleting activity:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get(
    getRouteTranslations("admin.activities", ":activity"),
    async (req: Request, res: Response) => {
        try {
            const activity = await Activity.findOne({ url: req.params.activity }).lean();
            if (!activity) return res.status(404).end();

            res.render("admin/activity", {
                // @ts-ignore
                csrfToken: req.csrfToken(),
                activity: activity
            });
        } catch (error) {
            console.error("Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
);

router.post("/activities/:activity", async (req: Request, res: Response) => {
    try {
        const errors: string[] = [];
        const { url, title, description, photo, scripts, content } = req.body;
        const urlPattern = /^[a-zA-Z0-9_-]{4,}$/;
        if (!urlPattern.test(url))
            errors.push(
                "URL must be longer than 3 characters and only contain letters, numbers, underscores, and hyphens."
            );

        const sanitizedData: any = {
            url: url.trim(),
            title: {},
            description: {},
            photo: photo,
            scripts: scripts,
            content: {}
        };

        if (title)
            Object.keys(title).forEach((key) => {
                if (title[key].trim() !== "" || key === "es") {
                    sanitizedData.title[key] = title[key].trim();
                }
            });

        if (description)
            Object.keys(description).forEach((key) => {
                if (description[key].trim() !== "" || key === "es") {
                    sanitizedData.description[key] = description[key].trim();
                }
            });

        if (content)
            Object.keys(content).forEach((key) => {
                if (content[key].trim() !== "" || key === "es") {
                    sanitizedData.content[key] = content[key].trim();
                }
            });

        if (errors.length > 0) {
            return res.status(400).json({ errors: errors });
        }

        const activity = await Activity.findOne({ url: req.params.activity });
        if (!activity) {
            return res.status(404).json({ errors: ["Activity not found."] });
        }

        await Activity.updateOne({ url: req.params.activity }, sanitizedData);
        res.redirect(`/admin/${__("admin.activities.url")}/${sanitizedData.url}`);
    } catch (error) {
        console.error("Error updating activity:", error);
        res.status(500).json({
            error: "Internal Server Error. Check that the new url isn't used by another activity."
        });
    }
});

// OTHER

router.post("/mdParse", (req: Request, res: Response) => {
    res.status(200).json({ md: parseMD(req.body.md) });
});

export default router;
