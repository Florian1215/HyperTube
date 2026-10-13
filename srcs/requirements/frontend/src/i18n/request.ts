import {getRequestConfig} from "next-intl/server";
import {headers} from "next/headers";
import {routing, tLocale} from "@/i18n/routing";

// The locale is never in the URL: it is the first language of the browser the site is translated in
function getBrowserLocale(acceptLanguage: string | null): tLocale {
    const languages = (acceptLanguage ?? "").split(",").map((part) => {
        const [tag, quality] = part.trim().split(";q=");
        return {language: tag.split("-")[0].toLowerCase(), quality: quality === undefined ? 1 : Number(quality) || 0};
    }).sort((a, b) => b.quality - a.quality);
    const match = languages.find(({language, quality}) => quality > 0 && routing.locales.includes(language as tLocale));

    return (match?.language as tLocale) ?? routing.defaultLocale;
}

export default getRequestConfig(async () => {
    const locale = getBrowserLocale((await headers()).get("accept-language"));

    return {
        locale,
        messages: (await import(`../../messages/${locale}.json`)).default
    };
});
