"use client";

import {useLocale, useTranslations} from "next-intl";
import SmallText from "@/components/ui/SmallText";
import {Link} from "@/i18n/navigation";
import formatURL from "@/utils/formatURL";
import LoadingImage from "@/components/ui/LoadingImage";
import HoverEffect from "@/components/ui/HoverEffect";
import ProfilePicture from "@/components/ProfilePicture";
import EpisodeLabel from "@/components/EpisodeLabel";
import {iMediaActivity} from "@/types/media";
import {RewatchIcon} from "@/components/Icons";
import {useMediaRightClick} from "@/components/MediaRightClick";

export function FriendsActivityList({activities}: {activities?: iMediaActivity[]}) {
    return (<div className="divide-gray divide-y lg:grid lg:grid-cols-[auto_auto_auto_1fr]">
        {activities?.map((activity, index) => <FriendActivityRow key={index} activity={activity}/>)}
    </div>);
}

function FriendActivityRow({activity}: {activity: iMediaActivity}) {
    const tMedia = useTranslations("media");
    const locale = useLocale();
    const {onContextMenu, menu} = useMediaRightClick(activity);

    return (<div className="flex items-center gap-3 p-3 lg:grid lg:grid-cols-subgrid lg:col-span-full lg:gap-x-4 lg:gap-y-1">
        <div className="flex shrink-0 gap-4" onContextMenu={onContextMenu}>
            <Link href={formatURL(activity)} title={activity.episode?.name || activity.title} className="relative w-28 sm:w-38 aspect-3/2 shrink-0">
                <HoverEffect className="absolute inset-0" innerClassName="overflow-hidden border">
                    <LoadingImage className="size-full object-cover" width={400} height={225} src={activity.episode?.poster_url || activity.backdrop_url} alt={tMedia("posterAlt", {title: activity.episode?.name || activity.title})}/>
                    <div className="custom-noise opacity-30"/>
                </HoverEffect>
            </Link>
        </div>
        <div className="flex flex-col flex-1 gap-1.5 min-w-0 lg:contents">
            <Link href={formatURL(activity)} className="flex flex-col lg:flex-row lg:flex-wrap lg:items-baseline gap-x-2 min-w-0 lg:max-w-md group" onContextMenu={onContextMenu}>
                <span className="font-semibold uppercase line-clamp-2 lg:line-clamp-none group-hover:text-accent truncate">{activity.title}</span>
                {activity.episode && <div className="flex items-baseline gap-2 min-w-0 text-sm text-gray">
                    <span className="shrink-0"><EpisodeLabel season={activity.episode.season_number} episode={activity.episode.episode_number}/></span>
                    <span className="truncate lg:whitespace-normal">{activity.episode.name}</span>
                </div>}
            </Link>
            <div className="flex items-center gap-3 min-w-0 lg:contents">
                <Link href={`/users/${activity.user.id}`} className="flex items-center gap-2 min-w-0 lg:ml-4">
                    <ProfilePicture size={3} user={activity.user}/>
                    <span className="hidden sm:block font-semibold truncate">{activity.user.username}</span>
                </Link>
                <div className="flex items-center justify-end gap-2 sm:gap-4 ml-auto shrink-0">
                    {activity.rewatch && <span title={tMedia("rewatch")} className="flex items-center gap-1 text-sm">
                        <RewatchIcon/>
                        <span className="hidden sm:inline">{tMedia("rewatch")}</span>
                    </span>}
                    {activity.watched_at && <SmallText>{new Date(activity.watched_at).toLocaleDateString(locale, {day: "numeric", month: "long", year: "numeric"})}</SmallText>}
                </div>
            </div>
        </div>
        {menu}
    </div>);
}

function formatRelativeDate(date: string, locale: string) {
    const days = Math.round((new Date(date).getTime() - Date.now()) / 86400000);
    const formatter = new Intl.RelativeTimeFormat(locale, {numeric: "auto"});

    if (days > -7)
        return formatter.format(days, "day");
    if (days > -30)
        return formatter.format(Math.round(days / 7), "week");
    if (days > -365)
        return formatter.format(Math.round(days / 30), "month");
    return formatter.format(Math.round(days / 365), "year");
}

export function getActivityKey(activity: iMediaActivity) {
    return `${activity.type}-${activity.id}` + (activity.episode ? `-${activity.episode.id}` : "");
}

export function groupActivities(activities: iMediaActivity[]) {
    const groups = new Map<string, iMediaActivity[]>();

    activities.forEach((activity) => {
        const key = getActivityKey(activity);
        const group = groups.get(key) ?? [];

        if (!group.some((other) => other.user.id === activity.user.id))
            group.push(activity);
        groups.set(key, group);
    });
    return [...groups.values()];
}

export function FriendActivityCard({activities}: {activities: iMediaActivity[]}) {
    const tMedia = useTranslations("media");
    const locale = useLocale();
    const media = activities[0];
    const {onContextMenu, menu} = useMediaRightClick(media);

    return (<div className="group relative min-w-28 max-w-md w-full" onContextMenu={onContextMenu}>
        {menu}
        <Link href={formatURL(media)} title={media.episode?.name || media.title} className="block relative aspect-5/6 sm:aspect-3/2">
            <HoverEffect className="absolute inset-0" innerClassName="overflow-hidden border">
                <LoadingImage className="size-full object-cover" width={400} height={225} src={media.episode?.poster_url || media.backdrop_url} alt={tMedia("posterAlt", {title: media.episode?.name || media.title})}/>
                <div className="custom-noise opacity-30"/>
                {media.episode && <div className="z-10 opacity-0 group-hover:opacity-100 hidden sm:flex absolute inset-0 p-2 items-end justify-center transition-opacity duration-200">
                    <div className="bg-gradient"/>
                    <EpisodeLabel season={media.episode.season_number} episode={media.episode.episode_number} className="z-10 text-white"/>
                </div>}
            </HoverEffect>
        </Link>
        <div className="absolute bottom-0.5 left-0.5 max-w-[calc(100%-0.25rem)] p-1 flex items-center -space-x-2 overflow-x-auto scrollbar-hide">
            {activities.map((activity) =>
                <Link key={activity.user.id} href={`/users/${activity.user.id}`} className="shrink-0 hover:z-10"
                      title={activity.user.username + (activity.watched_at ? ` · ${formatRelativeDate(activity.watched_at, locale)}` : "")}>
                    <ProfilePicture size={3} user={activity.user}/>
                </Link>)}
        </div>
    </div>);
}
