export const routing = {
    locales: ["en", "fr", "de"],
    defaultLocale: "en"
} as const;
export type tLocale = typeof routing.locales[number]
