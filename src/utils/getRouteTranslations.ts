import i18n from "i18n";

function getRouteTranslations(route: string, extra?: string) {
    extra = extra || "";
    return i18n.__l(route + ".url").map((translation) => `/${translation}/${extra}`);
}

export default getRouteTranslations;
