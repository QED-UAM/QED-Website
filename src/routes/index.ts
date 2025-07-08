import { Router, Request, Response } from "express";
import mailgun from "mailgun-js";
import path from "path";
import ejs from "ejs";
import { __ } from "i18n";
import getRouteTranslations from "../utils/getRouteTranslations";
import { MAILGUN_KEY, MAILGUN_DOMAIN } from "../config";
import { escapeHTML, parseMD } from "../utils/mdParser";
import { News } from "../models/news";

const router: Router = Router();

const mg = mailgun({ apiKey: MAILGUN_KEY, domain: MAILGUN_DOMAIN });

router.get("/", async (req: Request, res: Response) => {
    const lang = req.getLocale();

    try {
        let news = await News.aggregate([
            { $match: {} },
            { $limit: 1 },
            {
                $addFields: {
                    selectedTitle: { $ifNull: [`$title.${lang}`, `$title.es`] },
                    selectedDescription: { $ifNull: [`$description.${lang}`, `$description.es`] },
                    noTranslation: {
                        $or: [
                            { $ne: [`$title.${lang}`, `$selectedTitle`] },
                            { $ne: [`$description.${lang}`, `$selectedDescription`] }
                        ]
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    url: 1,
                    title: "$selectedTitle",
                    description: "$selectedDescription",
                    noTranslation: 1
                }
            }
        ]);

        if (news.length > 0) {
            news = news[0];
            // @ts-ignore
            if (news.description) {
                // @ts-ignore
                news.description = parseMD(news.description);
            }
        } else {
            // @ts-ignore
            news = null;
        }
        res.render("index", { news: news });
    } catch (e) {
        res.render("index", { news: null });
    }
});

router.get(getRouteTranslations("contact"), (req: Request, res: Response) => {
    res.render("contact");
});

router.get(getRouteTranslations("about"), (req: Request, res: Response) => {
    res.render("about");
});

router.post("/send-email", (req: Request, res: Response) => {
    const { name, email, message } = req.body;

    ejs.renderFile(
        path.join(__dirname, "../../views/util/email.ejs"),
        { name, email, message: escapeHTML(message) },
        (err, html) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error rendering email template");
            }

            const data = {
                from: `noreply@${MAILGUN_DOMAIN}`,
                to: "qed.uam@gmail.com",
                subject: `Nuevo mensaje desde la web - ${Date.now()}`,
                html: html
            };

            mg.messages().send(data, (error, body) => {
                if (error) {
                    console.error(error);
                    return res.status(500).send("Error sending email");
                }
                res.redirect(`/${__("contact.url")}`);
            });
        }
    );
});

export default router;
