// Builds a disposable test database: copies every collection from the source database
// (read-only) and adds fixtures for edge cases the end-to-end tests exercise.
// Refuses to touch any database whose name doesn't end in "_test".
//
//   SOURCE_URI=mongodb://127.0.0.1:27017/qed TEST_URI=mongodb://127.0.0.1:27017/qed_test npm run seed:e2e
import mongoose from "mongoose";

const SOURCE_URI = process.env.SOURCE_URI ?? "mongodb://127.0.0.1:27017/qed";
const TEST_URI = process.env.TEST_URI ?? "mongodb://127.0.0.1:27017/qed_test";

const FIXTURE_SCRIPT = `
class FixtureCounter {
    async start(container, params, savedState) {
        this.container = container;
        this.count = savedState ? savedState.count : params[0];
        this.label = document.createElement("p");
        this.label.className = "fixture-counter p-4 text-center bg-" + ielightbgclass;
        this.label.dataset.theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
        container.appendChild(this.label);
        window.addEventListener("on-theme-change", (event) => (this.label.dataset.theme = event.detail));
        this.render();
    }
    main() {
        this.count++;
        if (this.count % 10 === 0) this.render();
        if (this.saveData && this.count % 50 === 0) this.saveData({ count: this.count });
    }
    render() {
        this.label.textContent = "count:" + this.count;
    }
}
`;

const FIXTURE_CONTENT = (lang: string) => `# Fixture ${lang}

Texto con matemáticas $e^{i\\pi} + 1 = 0$.

::: js FixtureCounter
0
fixtureAll
allowPause, saveStates, allowFullscreen, openControls, h=64
:::

::: js FixtureCounter
100
fixtureAuto
autoPlay, autoPauseOnScroll, noStop
:::

::: js FixtureCounter
5
fixtureBare
noControls
:::

::: solution ${lang}
La respuesta es 42.
:::

::: container didyouknow
Sin sufijo de idioma.
:::

::: iquestion
¿Pregunta?
:::
`;

async function main() {
    // SOURCE_URI=none seeds only the fixtures (e.g. in CI, where there is no copy of the data).
    const source = SOURCE_URI === "none" ? null : await mongoose.createConnection(SOURCE_URI).asPromise();
    const target = await mongoose.createConnection(TEST_URI).asPromise();
    const targetName = target.db!.databaseName;
    if (!targetName.endsWith("_test")) throw new Error(`Refusing to seed "${targetName}": name must end in _test`);
    if (source && targetName === source.db!.databaseName) throw new Error("Source and test databases are the same");

    await target.db!.dropDatabase();
    for (const { name } of source ? await source.db!.listCollections().toArray() : []) {
        if (!source) continue;
        if (name.startsWith("system.")) continue;
        const docs = await source.db!.collection(name).find().toArray();
        await target.db!.createCollection(name);
        if (docs.length) await target.db!.collection(name).insertMany(docs);
        for (const index of await source.db!.collection(name).indexes()) {
            if (index.name === "_id_") continue;
            const { key, name: indexName, v: _v, ns: _ns, ...options } = index as Record<string, unknown>;
            await target.db!.collection(name).createIndex(key as Record<string, 1>, { name: indexName as string, ...options });
        }
    }

    const magazines = target.db!.collection("magazines");
    const posts = target.db!.collection("posts");
    const users = target.db!.collection("users");
    const activities = target.db!.collection("activities");

    const visible = await magazines.insertOne({
        url: "e2e-issue",
        cover: "",
        visible: true,
        title: { es: "Número de prueba: edición.1" },
        description: { es: "Descripción **markdown**." }
    });
    const hidden = await magazines.insertOne({
        url: "e2e-hidden",
        cover: "",
        visible: false,
        title: { es: "Número oculto" },
        description: { es: "" }
    });
    await target.db!.collection("admins").updateOne(
        { email: "e2e-admin@example.com" },
        { $set: { email: "e2e-admin@example.com", name: "E2E Admin" } },
        { upsert: true }
    );
    await target.db!.collection("sessions").createIndex({ expires: 1 }, { expireAfterSeconds: 0 }).catch(() => {});

    const author = await users.insertOne({
        url: "e2e-author",
        name: "Autora de Prueba",
        photo: "",
        socialMedia: { email: "autora@example.com" },
        about: { es: "Bio *de prueba*." },
        directiveBoard: []
    });

    await posts.insertMany([
        {
            url: "e2e-interactive",
            title: { es: "Título: con dos puntos. Y punto", en: "Title: with a colon. And a dot" },
            type: "recreational",
            description: { es: "Artículo con componentes interactivos", en: "Interactive article" },
            scripts: FIXTURE_SCRIPT,
            content: { es: FIXTURE_CONTENT("es"), en: FIXTURE_CONTENT("en") },
            tags: [],
            authors: [{ user_id: author.insertedId, role: "author" }],
            magazine_id: visible.insertedId,
            views: 0
        },
        {
            url: "e2e-no-authors",
            title: { es: "Sin autores" },
            type: "post",
            description: { es: "Solo en español" },
            scripts: "",
            content: { es: "Contenido sin autores." },
            tags: [],
            authors: [],
            magazine_id: visible.insertedId,
            views: 0
        },
        {
            url: "e2e-hidden-post",
            title: { es: "En número oculto" },
            type: "post",
            description: { es: "" },
            scripts: "",
            content: { es: "No debería verse." },
            tags: [],
            authors: [],
            magazine_id: hidden.insertedId,
            views: 0
        }
    ]);

    await activities.insertOne({
        url: "e2e-activity",
        title: { es: "Actividad interactiva" },
        description: { es: "Actividad con un componente" },
        photo: "",
        scripts: FIXTURE_SCRIPT,
        content: { es: FIXTURE_CONTENT("es") },
        created_at: new Date("2020-01-01T10:00:00Z")
    });

    console.log(`Seeded ${targetName} from ${source?.db!.databaseName ?? "fixtures only"}`);
    await Promise.all([source?.close(), target.close()]);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
