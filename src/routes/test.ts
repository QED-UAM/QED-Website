/* eslint-disable */
import { Router, Request, Response } from "express";
import { User } from "../models/user";
import { Magazine } from "../models/magazine";
import { Post } from "../models/post";
import mongoose from "mongoose";
import { escapeHTML } from "../utils/mdParser";

const router: Router = Router();

router.get("/", async (req: Request, res: Response) => {
    /*
    const newUser = new User({
        url: "hectortablero",
        email: "hector.tablerodiaz@gmail.com",
        name: "Héctor Tablero Díaz",
        about: {
            "es": "Estudiante de 3º de [Ciencia e Ingeniería de Datos](https://www.uam.es/uam/ingenieria-datos) en la UAM",
            "en": "3rd year [Data Science and Engineering](https://www.uam.es/uam/en/ingenieria-datos) student at UAM"
        }
    });
    const result = await newUser.save();
    console.log(result);
    */
    /*
    const newMagazine = new Magazine({
        url: "2024",
        title: {
            "es": "Edición 2023-2024",
            "en": "2023-2024 edition"
        },
        description: {
            "es": "testES",
            "en": "testEN"
        }
    });
    const result = await newMagazine.save();
    console.log(result);
    */
    /*
    const newPost = new Post({
        url: ["numeros", "numbers"],
        title: {
            es: "Números",
            en: "Numbers"
        },
        type: "post"
        content: {
            es: "Esto es contenido sobre **números**",
            en: "This is content about **numbers**"
        },
        tags: ["algebra"],
        authors: [
            {
                user_id: new mongoose.Types.ObjectId("6658424c5d95f94a0017614b"),
                role: "original_author"
            }
        ],
        magazine_id: new mongoose.Types.ObjectId("665842d1479867fc6c2dace5"),
    });
    const result = await newPost.save();
    console.log(result);
    */
    //res.render("test");
    res.render("util/email", {
        name: "Héctor Tablero Díaz",
        email: "hector.tablerodiaz@gmail.com",
        message:
            escapeHTML(`Si rutrum class sodales amet maecenas. Mus platea ullamcorper conubia tincidunt taciti metus sodales natoque curae consequat. Massa fames sodales risus velit magnis praesent.
Nec integer blandit libero rutrum consectetur sapien vulputate himenaeos ridiculus. Praesent tempor suspendisse platea sodales si quis curabitur.

Tempor tempus libero ornare cras semper scelerisque viverra pharetra nisl. Rutrum blandit eu praesent torquent maecenas et mattis luctus ad est nunc.`)
    });
});

export default router;
