import React from "react";
import {routing, tLocale} from "@/i18n/request";

export default function LanguageDropdown({handleSwitchLanguage, selected}: {handleSwitchLanguage: (l: tLocale) => void, selected: tLocale}) {
    const languages: Record<tLocale, string> = {en: "English", fr: "Français", de: "Deutsch"};

    console.log("languages", languages);
    return (<div className="absolute top-10 right-1/30 z-50 p-8">
        <div className="flex flex-col gap-1 items-start bg-white py-4 px-5 custom-shadow-s border">
            {routing.locales.map((code) => (
                <button key={code} className={"custom-underline text-xl " + (selected === code ? "font-base font-light" : "font-hairline")} onClick={() => handleSwitchLanguage(code)}>{languages[code]}</button>
            ))}
        </div>
    </div>);
}
