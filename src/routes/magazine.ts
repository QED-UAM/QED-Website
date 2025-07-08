import { Router, Request, Response } from "express";
import { Magazine } from "../models/magazine";
import { Post } from "../models/post";
import moment from "moment";
import { parseMD } from "../utils/mdParser";
import getRouteTranslations from "../utils/getRouteTranslations";

const router: Router = Router();

router.get("/", async (req: Request, res: Response) => {
    const lang = req.getLocale();

    try {
        const magazines = await Magazine.aggregate([
            { $match: { visible: true } },
            {
                $lookup: {
                    from: "posts",
                    localField: "_id",
                    foreignField: "magazine_id",
                    as: "posts"
                }
            },
            {
                $addFields: {
                    selectedTitle: { $ifNull: [`$title.${lang}`, `$title.es`] }
                }
            },
            {
                $addFields: {
                    noTranslation: {
                        $cond: {
                            if: { $eq: [`$selectedTitle`, `$title.${lang}`] },
                            then: false,
                            else: true
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    url: 1,
                    cover: 1,
                    title: "$selectedTitle",
                    noTranslation: 1
                }
            }
        ]);

        if (magazines.length > 0) {
            res.render("magazine", { magazines: magazines });
        } else {
            res.status(404).render("errors/404");
        }
    } catch (error) {
        console.error(error);
        res.status(500).render("errors/500");
    }
});

router.get("/:url", async (req: Request, res: Response) => {
    const url = req.params.url;
    const lang = req.getLocale();

    try {
        const magazines = await Magazine.aggregate([
            { $match: { url: url, visible: true } },
            { $limit: 1 },
            {
                $lookup: {
                    from: "posts",
                    localField: "_id",
                    foreignField: "magazine_id",
                    as: "posts"
                }
            },
            {
                $addFields: {
                    selectedTitle: { $ifNull: [`$title.${lang}`, `$title.es`] },
                    selectedDescription: { $ifNull: [`$description.${lang}`, `$description.es`] }
                }
            },
            {
                $addFields: {
                    noTranslation: {
                        $cond: {
                            if: { $eq: [`$title.${lang}`, `$selectedTitle`] },
                            then: false,
                            else: true
                        }
                    },
                    posts: {
                        $map: {
                            input: "$posts",
                            as: "post",
                            in: {
                                url: "$$post.url",
                                title: { $ifNull: [`$$post.title.${lang}`, `$$post.title.es`] },
                                description: {
                                    $ifNull: [`$$post.description.${lang}`, `$$post.description.es`]
                                },
                                tags: "$$post.tags",
                                type: "$$post.type",
                                selectedContent: {
                                    $ifNull: [`$$post.content.${lang}`, `$$post.content.es`]
                                },
                                noTranslation: {
                                    $cond: {
                                        if: {
                                            $eq: [
                                                `$$post.content.${lang}`,
                                                `$$post.selectedContent`
                                            ]
                                        },
                                        then: true,
                                        else: false
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    cover: 1,
                    title: "$selectedTitle",
                    description: "$selectedDescription",
                    noTranslation: 1,
                    posts: {
                        url: 1,
                        title: 1,
                        description: 1,
                        tags: 1,
                        type: 1,
                        noTranslation: 1
                    }
                }
            }
        ]);

        if (magazines.length > 0) {
            const magazine = magazines[0];
            magazine.description = parseMD(magazine.description);
            res.render("magazine/issue", { magazine: magazine });
        } else {
            res.status(404).render("errors/404");
        }
    } catch (error) {
        console.error(error);
        res.status(500).render("errors/500");
    }
});

router.get(getRouteTranslations("magazine.post", ":url"), async (req: Request, res: Response) => {
    const url = req.params.url;
    const lang = req.getLocale();

    try {
        const posts = await Post.aggregate([
            {
                $match: {
                    url: url
                }
            },
            { $limit: 1 },
            {
                $lookup: {
                    from: "magazines",
                    localField: "magazine_id",
                    foreignField: "_id",
                    as: "magazine"
                }
            },
            { $unwind: "$magazine" },
            {
                $lookup: {
                    from: "users",
                    localField: "authors.user_id",
                    foreignField: "_id",
                    as: "authorDetails"
                }
            },
            { $unwind: "$authors" },
            { $unwind: "$authorDetails" },
            {
                $match: {
                    $expr: {
                        $eq: ["$authors.user_id", "$authorDetails._id"]
                    }
                }
            },
            {
                $addFields: {
                    "authorDetails.role": "$authors.role"
                }
            },
            {
                $addFields: {
                    selectedTitle: { $ifNull: [`$title.${lang}`, "$title.es"] },
                    selectedDescription: { $ifNull: [`$description.${lang}`, "$description.es"] },
                    selectedContent: { $ifNull: [`$content.${lang}`, "$content.es"] },
                    noTranslation: {
                        $cond: {
                            if: { $eq: [`$content.${lang}`, `$selectedContent`] },
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $group: {
                    _id: "$_id",
                    title: { $first: "$selectedTitle" },
                    description: { $first: "$selectedDescription" },
                    scripts: { $first: "$scripts" },
                    content: { $first: "$selectedContent" },
                    tags: { $first: "$tags" },
                    type: { $first: "$type" },
                    created_at: { $first: "$created_at" },
                    updated_at: { $first: "$updated_at" },
                    views: { $first: "$views" },
                    magazine: { $first: "$magazine" },
                    authors: {
                        $push: {
                            url: "$authorDetails.url",
                            name: "$authorDetails.name",
                            role: "$authors.role",
                            photo: "$authorDetails.photo"
                        }
                    },
                    noTranslation: { $first: "$noTranslation" }
                }
            },
            {
                $project: {
                    _id: 0,
                    title: 1,
                    description: 1,
                    scripts: 1,
                    content: 1,
                    tags: 1,
                    type: 1,
                    created_at: 1,
                    updated_at: 1,
                    views: 1,
                    magazine: {
                        url: 1,
                        title: { $ifNull: [`$magazine.title.${lang}`, "$magazine.title.es"] },
                        visible: 1
                    },
                    authors: 1,
                    noTranslation: 1
                }
            }
        ]);

        if (posts.length > 0 && posts[0].magazine.visible) {
            const post = posts[0];
            post.created_at = moment(post.created_at).format("DD/MM/YYYY");
            post.updated_at = moment(post.updated_at).format("DD/MM/YYYY");
            post.content = parseMD(post.content);
            res.render("magazine/post", { post: post });
        } else {
            res.status(404).render("errors/404");
        }
    } catch (error) {
        console.error(error);
        res.status(500).render("errors/500");
    }
});

router.post(
    getRouteTranslations("magazine.post", ":url/increment-views"),
    async (req: Request, res: Response) => {
        const post = await Post.findOne({ url: req.params.url });
        if (post) {
            await post.incrementViews();
            res.status(200).end();
        } else {
            res.status(404).render("errors/404");
        }
    }
);

export default router;
