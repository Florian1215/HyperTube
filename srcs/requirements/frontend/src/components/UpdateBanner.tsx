"use client";

import React, {useState} from "react";
import {useTranslations} from "next-intl";
import useAuth from "@/contexts/AuthContext";
import useModal from "@/contexts/ModalContext";
import {useCurrentUpdate} from "@/services/updates.service";
import {tUserColor} from "@/types/user";
import {CrossIcon} from "@/components/Icons";

const DISMISSED_KEY = "dismissed-update";
// each half has to be wider than the screen, or a gap shows before the loop restarts
const MARQUEE_REPEAT = 20;

const COLORS: Record<tUserColor, string> = {
    yellow: "bg-yellow hover:bg-yellow-hover",
    pink: "bg-pink hover:bg-pink-hover",
    green: "bg-green hover:bg-green-hover",
    purple: "bg-purple hover:bg-purple-hover",
    blue: "bg-blue hover:bg-blue-hover",
    red: "bg-red hover:bg-red-hover",
};

function readDismissed() {
    try {
        return typeof window === "undefined" ? null : localStorage.getItem(DISMISSED_KEY);
    } catch {
        return null;
    }
}

/** Announces the update published in the last 7 days, until the visitor reads or closes it. */
export default function UpdateBanner() {
    const t = useTranslations("updates");
    const {user} = useAuth();
    const {openModal} = useModal();
    const {data} = useCurrentUpdate();
    const [dismissed, setDismissed] = useState(readDismissed);
    const update = data?.update;

    if (!update || dismissed === update.version)
        return null;

    const dismiss = () => {
        setDismissed(update.version);
        try {
            localStorage.setItem(DISMISSED_KEY, update.version);
        } catch {
            // private browsing: the banner simply comes back on the next visit
        }
    };

    const label = t("banner", {version: update.version});
    // two identical halves sliding by their own width: the loop never shows a gap
    const half = (hidden: boolean) => (<span aria-hidden={hidden || undefined}
                                             className="flex shrink-0 animate-marquee motion-reduce:animate-none [animation-duration:60s]">
        {Array.from({length: MARQUEE_REPEAT}, (_, i) => <span key={i} className="shrink-0">{label}<span className="px-3">·</span></span>)}
    </span>);

    return (<div className={`top-0 z-40 flex items-center border-b text-black ${user ? COLORS[user.color] : "bg-accent"}`}>
        <button className="flex flex-1 min-w-0 overflow-hidden py-1 font-wide font-bold uppercase text-xs sm:text-sm whitespace-nowrap cursor-pointer"
                title={label}
                onClick={() => {
                    dismiss();
                    openModal({type: "update", update});
                }}>
            {half(false)}
            {half(true)}
        </button>
        <button className={`shrink-0 self-stretch flex items-center px-3 border-l cursor-pointer ${user ? COLORS[user.color] : "bg-accent"}`}
                title={t("close")} aria-label={t("close")} onClick={dismiss}>
            <CrossIcon size={12} color="current" className="stroke-2"/>
        </button>
    </div>);
}
