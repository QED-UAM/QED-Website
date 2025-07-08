import { Router, Request, Response } from "express";
import { Activity } from "../models/activity";
import { parseMD } from "../utils/mdParser";
import moment from "moment";

const router: Router = Router();

router.get("/", async (req: Request, res: Response) => {
    const lang = req.getLocale();

    try {
        const activities = await Activity.aggregate([
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
                    photo: 1,
                    title: "$selectedTitle",
                    description: "$selectedDescription",
                    created_at: 1,
                    noTranslation: 1
                }
            },
            {
                $sort: { created_at: -1 }
            }
        ]);

        activities.forEach((activity) => {
            activity.description = parseMD(activity.description);
            activity.created_at = moment(activity.created_at).format("DD/MM/YYYY");
        });
        res.render("activities", { activities: activities });
    } catch (error) {
        console.error(error);
        res.status(500).render("errors/500");
    }
});

router.get("/:url", async (req: Request, res: Response) => {
    const url = req.params.url;
    const lang = req.getLocale();

    try {
        const activities = await Activity.aggregate([
            {
                $match: {
                    url: url
                }
            },
            { $limit: 1 },
            {
                $addFields: {
                    selectedTitle: { $ifNull: [`$title.${lang}`, "$title.es"] },
                    selectedDescription: { $ifNull: [`$description.${lang}`, "$description.es"] },
                    selectedContent: { $ifNull: [`$content.${lang}`, "$content.es"] },
                    noTranslation: {
                        $cond: {
                            if: { $eq: [`$title.${lang}`, "$selectedTitle"] },
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
                    photo: { $first: "$photo" },
                    description: { $first: "$selectedDescription" },
                    scripts: { $first: "$scripts" },
                    content: { $first: "$selectedContent" },
                    created_at: { $first: "$created_at" },
                    noTranslation: { $first: "$noTranslation" }
                }
            },
            {
                $project: {
                    _id: 0,
                    title: 1,
                    photo: 1,
                    description: 1,
                    scripts: 1,
                    content: 1,
                    created_at: 1,
                    noTranslation: 1
                }
            }
        ]);

        if (activities.length > 0) {
            const activity = activities[0];
            moment.locale(lang);
            if (lang === "es") {
                activity.created_at = moment(activity.created_at).format("D [de] MMMM [de] YYYY");
            } else {
                activity.created_at = moment(activity.created_at).format("MMMM D, YYYY");
            }
            activity.description = parseMD(activity.description);
            activity.content = parseMD(activity.content);
            res.render("activities/activity", { activity: activity });
        } else {
            res.status(404).render("errors/404");
        }
    } catch (error) {
        console.error(error);
        res.status(500).render("errors/500");
    }
});

export default router;
