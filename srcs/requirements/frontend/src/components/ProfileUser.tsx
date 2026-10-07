"use client";

import React, {useState} from "react";
import ProfilePicture from "@/components/ProfilePicture";
import {iUser} from "@/types/user";
import {useSearchParams} from "next/navigation";
import {useLocale, useTranslations} from "next-intl";
import {usePathname, useRouter} from "@/i18n/navigation";
import {tTab} from "@/types/utils";
import Tabs from "@/components/ui/Tabs";
import FollowButton from "@/components/FollowButton";
import {useUserHistory} from "@/services/users.service";
import {useProfileComments} from "@/services/comments.service";


export default function ProfileUser({user, tabs, updateUserAction}: {user: iUser, tabs: tTab, updateUserAction?: (patch: Partial<iUser>) => void}) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const tabParam = searchParams.get("tab");
    let initialTab: number = 0;
    if (tabParam) {
        const idx = tabs.findIndex(a => a.name === tabParam)
        if (idx >= 0)
            initialTab = idx;
    }
    const [activeTab, setActiveTab] = useState<number>(initialTab);
    const t = useTranslations("profile.tabs");
    const tProfile = useTranslations("profile");
    const locale = useLocale();
    const ActiveTab = tabs[activeTab].comp;
    const {data: movies} = useUserHistory(user.id, "movies");
    const {data: series} = useUserHistory(user.id, "series");
    const {data: comments} = useProfileComments(user.id, 1);
    const counts: Record<string, number | undefined> = {movies: movies?.count, series: series?.count, comments: comments?.count};

    const date = new Date(user.created_at);
    const memberSince = new Intl.DateTimeFormat(locale, {day: "2-digit", month: "2-digit", year: "numeric"}).format(date).replace(/[\/-]/g, ".");

    const switchTab = (tabIdx: number) => {
        if (activeTab !== tabIdx) {
            const params = new URLSearchParams(searchParams.toString());
            params.set("tab", tabs[tabIdx].name);
            router.push(`${pathname}?${params.toString()}`);
            setActiveTab(tabIdx);
        }
    }

    return (<div className="flex flex-col gap-6 sm:gap-12 xl:gap-16 px-2 md:px-4 mt-12">
        <div className="flex flex-col gap-4 items-center mb-6">
            <div className="flex items-center gap-4 justify-center">
                <ProfilePicture user={user} size={1}/>
                <div className="flex flex-col items-start">
                    <h2>{user.username}</h2>
                    <p className="uppercase mb-2">{tProfile("memberSince", {date: memberSince})}</p>
                </div>
            </div>
            {!updateUserAction && <FollowButton user={user} className="w-32"/>}
        </div>
        <Tabs tabs={tabs.map((tab) => t(tab.name))} counts={tabs.map((tab) => counts[tab.name])} activeTab={activeTab} onChange={switchTab}/>
        <ActiveTab user={user} updateUser={updateUserAction}/>
        <div />
    </div>);
}
