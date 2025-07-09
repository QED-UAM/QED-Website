import { Router, Request, Response } from "express";
import { User } from "../models/user";
import { Post } from "../models/post";
import { Magazine } from "../models/magazine";
import { parseMD } from "../utils/mdParser";

const router: Router = Router();

router.get("/:url", async (req: Request, res: Response) => {
    const lang = req.getLocale();

    const user = await User.findOne({ url: req.params.url }).lean();
    if (user) {
        const collaboratedPosts = (await Post.find({ "authors.user_id": user._id })
            .populate({
                path: "magazine_id",
                select: "title visible",
                match: { visible: true }
            })
            .select("title url description authors magazine_id")
            .lean()).filter(post => post.magazine_id !== null);

        const titleCounts = new Map<string, number>();
        collaboratedPosts.forEach((post) => {
            const title = post.title[lang] || post.title.es;
            titleCounts.set(title, (titleCounts.get(title) || 0) + 1);
        });

        const postsWithRoles = collaboratedPosts.map((post) => {
            const author = post.authors.find(
                (author: any) => author.user_id.toString() === user._id.toString()
            );
            const title = post.title[lang] || post.title.es;
            const showMagazineTitle = titleCounts.get(title)! > 1;

            const postTitle = post.title[lang] || post.title.es;
            const postDescription = post.description[lang] || post.description.es;
            const noTranslation = !post.title[lang];

            return {
                title: postTitle,
                url: post.url,
                description: postDescription,
                role: author ? author.role : "",
                magazineTitle: post.magazine_id
                    ? (post.magazine_id as any).title[lang] || (post.magazine_id as any).title.es
                    : null,
                showMagazineTitle: showMagazineTitle,
                noTranslation: noTranslation
            };
        });

        res.render("profile", {
            user: {
                ...user,
                about: parseMD(user.about[lang] || user.about.es),
                directiveBoard: user?.directiveBoard ? user.directiveBoard : [],
                collaboratedPosts: postsWithRoles
            }
        });
    } else {
        res.status(404).render("errors/404");
    }
});

export default router;
