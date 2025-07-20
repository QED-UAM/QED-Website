import { Router, Request, Response } from "express";
import path from "path";
import ejs from "ejs";
import { __ } from "i18n";
import getRouteTranslations from "../utils/getRouteTranslations";
import { BREVO_KEY } from "../config";
import { escapeHTML, parseMD } from "../utils/mdParser";
import { News } from "../models/news";
import { User } from "../models/user";
import * as brevo from "@getbrevo/brevo";

const router: Router = Router();

const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_KEY);

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

router.get(getRouteTranslations("about"), async (req: Request, res: Response) => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    let currentSchoolYear;
    if (currentMonth >= 8) {
        // September is 8
        currentSchoolYear = `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
    } else {
        currentSchoolYear = `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
    }

    const boardMembers = await User.find({
        "directiveBoard.year": currentSchoolYear
    });

    res.render("about", { boardMembers, currentSchoolYear });
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

            const sendSmtpEmail = new brevo.SendSmtpEmail();

            sendSmtpEmail.to = [{ email: "qed.uam@gmail.com", name: "QED UAM" }];
            sendSmtpEmail.sender = { email: "qed.uam@gmail.com", name: "QED UAM" };
            sendSmtpEmail.replyTo = { email, name };
            sendSmtpEmail.templateId = 2;
            sendSmtpEmail.params = {
                CONTACT_NAME: name,
                CONTACT_EMAIL: email,
                CONTENT: message.replace(/\n/g, "<br>")
            };

            apiInstance.sendTransacEmail(sendSmtpEmail).then(
                function (data) {
                    res.redirect(`/${__("email-successful.url")}`);
                },
                function (error) {
                    console.error(error);
                    return res.status(500).send("Error sending email");
                }
            );
        }
    );
});

router.get(getRouteTranslations("email-successful"), (req: Request, res: Response) => {
    res.render("email-successful");
});

export default router;
