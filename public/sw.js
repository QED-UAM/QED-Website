// QED service worker: offline fallback pages, nothing else.
//
// - Only page navigations are intercepted. Assets, API calls and form posts always go
//   straight to the network, and nothing is served from cache while online.
// - No artificial timeout: slow pages load normally.
// - When the network request fails, the visitor gets "no internet" or "server down" depending
//   on whether the internet is reachable. A 502/503/504 from the reverse proxy (the site
//   container restarting, e.g. during a Watchtower update) also shows "server down".
// - The offline pages poll /endpoints/health and reload as soon as the site is back.

const CACHE = "qed-offline-v2";
const LANGUAGES = ["es", "en"];
const PRECACHE = [
    ...LANGUAGES.flatMap((lang) => [`/_offline/nointernet/${lang}.html`, `/_offline/noserver/${lang}.html`]),
    "/_offline/offline.css",
    "/_offline/offline.js",
    "/js/theme.js",
    "/images/favicon.png",
    "/images/qed.svg"
];

// First path segment → language, for when the language cookie can't be read.
const SEGMENT_LANGUAGE = {
    revista: "es", actividades: "es", nosotros: "es", contacto: "es", perfil: "es", "email-enviado": "es",
    magazine: "en", activities: "en", about: "en", contact: "en", profile: "en", "email-successful": "en"
};

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE)
            .then((cache) => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    // Files the offline pages use: network first, cached copy when the site is unreachable.
    if (PRECACHE.includes(url.pathname) && request.mode !== "navigate") {
        event.respondWith(
            fetch(request)
                .then(async (response) => (response.ok ? response : ((await caches.match(url.pathname)) ?? response)))
                .catch(async () => (await caches.match(url.pathname)) ?? Response.error())
        );
        return;
    }

    if (request.mode !== "navigate" || url.pathname.startsWith("/_offline/")) return;
    event.respondWith(navigate(request, url));
});

async function navigate(request, url) {
    try {
        const response = await fetch(request);
        if (response.status === 502 || response.status === 503 || response.status === 504) {
            return (await offlinePage("noserver", url)) ?? response;
        }
        return response;
    } catch {
        const kind = (await internetReachable()) ? "noserver" : "nointernet";
        return (await offlinePage(kind, url)) ?? Response.error();
    }
}

async function internetReachable() {
    if (self.navigator && self.navigator.onLine === false) return false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
        await fetch("https://www.gstatic.com/generate_204", {
            mode: "no-cors",
            cache: "no-store",
            signal: controller.signal
        });
        return true;
    } catch {
        return false;
    } finally {
        clearTimeout(timer);
    }
}

async function language(url) {
    const query = url.searchParams.get("lang");
    if (LANGUAGES.includes(query)) return query;
    try {
        const cookie = self.cookieStore ? await self.cookieStore.get("lang") : null;
        if (cookie && LANGUAGES.includes(cookie.value)) return cookie.value;
    } catch {
        /* cookieStore unavailable */
    }
    const segment = url.pathname.split("/")[1];
    if (SEGMENT_LANGUAGE[segment]) return SEGMENT_LANGUAGE[segment];
    const preferred = (self.navigator.languages || []).map((lang) => lang.split("-")[0]);
    return preferred.find((lang) => LANGUAGES.includes(lang)) ?? "es";
}

async function offlinePage(kind, url) {
    const page = await caches.match(`/_offline/${kind}/${await language(url)}.html`);
    if (!page) return undefined;
    return new Response(page.body, {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
    });
}
