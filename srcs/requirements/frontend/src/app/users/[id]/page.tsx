"use client";

import React, {useEffect, useState} from "react";
import useHandleError from "@/hooks/useHandleError";
import {useUser, useUserHistory, useUserWatchlist} from "@/services/users.service";
import {useProfileComments} from "@/services/comments.service";
import {useParams, useSearchParams} from "next/navigation";
import {useLocale, useTranslations} from "next-intl";
import {usePathname, useRouter} from "@/i18n/navigation";
import {ApiError} from "@/services/apiClient";
import {tTab} from "@/types/utils";
import useAuth from "@/contexts/AuthContext";
import {TabMovies, TabSeries, TabWatchlist} from "@/app/users/[id]/TabMedia";
import TabComments from "@/app/users/[id]/TabComments";
import ProfilePicture from "@/components/ProfilePicture";
import Tabs from "@/components/ui/Tabs";
import FollowButton from "@/components/FollowButton";
import PageMeta from "@/components/PageMeta";

const tabs: tTab = [{name: "movies", comp: TabMovies}, {name: "series", comp: TabSeries}, {name: "watchlist", comp: TabWatchlist}, {name: "comments", comp: TabComments}];

export default function Page() {
    const params = useParams();
    const userId = params.id as string;
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const [errorNode, setErrorNode] = useState<React.ReactNode>(null);
    const [activeTab, setActiveTab] = useState<number>(Math.max(tabs.findIndex((tab) => tab.name === searchParams.get("tab")), 0));
    const handleError = useHandleError();
    const t = useTranslations("profile.tabs");
    const tProfile = useTranslations("profile");
    const tMeta = useTranslations("meta");
    const locale = useLocale();
    const {user: authUser, loading} = useAuth();
    const {data: user, error} = useUser(userId, !loading, authUser?.id);
    const meta = <PageMeta title={user?.username ?? tMeta("user")} description={user ? tMeta("userDescription", {username: user.username}) : undefined}/>;
    const {data: movies} = useUserHistory(user?.id, "movies");
    const {data: series} = useUserHistory(user?.id, "series", 1, authUser?.group_series ?? true);
    const {data: watchlist} = useUserWatchlist(user?.id);
    const {data: comments} = useProfileComments(user?.id, 1);
    const counts: Record<string, number | undefined> = {movies: movies?.count, series: series?.count, watchlist: watchlist?.count, comments: comments?.count};

    useEffect(() => {
        if (error) {
            const node = handleError(error as ApiError, "User");
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setErrorNode(node);
        }
    }, [error, handleError]);

    if (errorNode || !user)
        return (<>{meta}{errorNode}</>);

    const ActiveTab = tabs[activeTab].comp;
    const memberSince = new Intl.DateTimeFormat(locale, {day: "2-digit", month: "2-digit", year: "numeric"}).format(new Date(user.created_at)).replace(/[\/-]/g, ".");

    const switchTab = (tabIdx: number) => {
        if (activeTab !== tabIdx) {
            const params = new URLSearchParams(searchParams.toString());
            params.set("tab", tabs[tabIdx].name);
            router.push(`${pathname}?${params.toString()}`);
            setActiveTab(tabIdx);
        }
    }

    return (<div className="flex flex-col gap-6 sm:gap-12 xl:gap-16 px-2 md:px-4 mt-8 sm:mt-12">
        {meta}
        <div className="flex flex-col gap-4 items-center mb-6">
            <div className="flex items-center gap-4 justify-center">
                <ProfilePicture user={user} size={1}/>
                <div className="flex flex-col items-start">
                    <h3>{user.username}</h3>
                    <p className="uppercase mb-2">{tProfile("memberSince", {date: memberSince})}</p>
                </div>
            </div>
            <FollowButton user={user} className="w-32"/>
        </div>
        <Tabs tabs={tabs.map((tab) => t(tab.name))} counts={tabs.map((tab) => counts[tab.name])} activeTab={activeTab} onChange={switchTab}/>
        <ActiveTab user={user}/>
        <div />
    </div>);
}
