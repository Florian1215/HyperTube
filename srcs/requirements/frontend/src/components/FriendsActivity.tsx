"use client";

import {useLocale, useTranslations} from "next-intl";
import SmallText from "@/components/ui/SmallText";
import useAuth from "@/contexts/AuthContext";
import {Link} from "@/i18n/navigation";
import formatURL from "@/utils/formatURL";
import LoadingImage from "@/components/ui/LoadingImage";
import ProfilePicture from "@/components/ProfilePicture";
import EpisodeLabel from "@/components/EpisodeLabel";
import {iMediaActivity} from "@/types/media";
import {RewatchIcon} from "@/components/Icons";
import {useMediaRightClick} from "@/components/MediaRightClick";

export function getImage(activity: iMediaActivity, groupSeries: boolean) {
    return (!groupSeries && activity.episode?.poster_url) || activity.backdrop_url;
}

export function FriendsActivityList({activities}: {activities?: iMediaActivity[]}) {
    return (<div className="divide-gray divide-y lg:grid lg:grid-cols-[auto_auto_auto_1fr]">
        {activities?.map((activity, index) => <FriendActivityRow key={index} activity={activity}/>)}
    </div>);
}

function FriendActivityRow({activity}: {activity: iMediaActivity}) {
    const tMedia = useTranslations("media");
    const locale = useLocale();
    const {onContextMenu, menu} = useMediaRightClick(activity);

    return (<div className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3 lg:grid lg:grid-cols-subgrid lg:col-span-full">
        <div className="flex gap-4" onContextMenu={onContextMenu}>
            <Link href={formatURL(activity)} title={activity.title} className="relative w-38 aspect-3/2 shrink-0 overflow-hidden border">
                <LoadingImage className="size-full object-cover" width={400} height={225} src={activity.backdrop_url} alt={tMedia("posterAlt", {title: activity.title})}/>
                <div className="custom-noise opacity-30"/>
            </Link>
            {activity.episode?.poster_url && <Link href={formatURL(activity)} title={activity.episode.name} className="relative w-38 aspect-3/2 shrink-0 overflow-hidden border">
                <LoadingImage className="size-full object-cover" width={400} height={225} src={activity.episode.poster_url} alt={tMedia("posterAlt", {title: activity.episode.name ?? activity.title})}/>
                <div className="custom-noise opacity-30"/>
            </Link>}
        </div>
        <Link href={formatURL(activity)} className="flex flex-wrap items-baseline gap-x-2 min-w-0 lg:max-w-md group" onContextMenu={onContextMenu}>
            <span className="font-semibold uppercase group-hover:text-accent">{activity.title}</span>
            {activity.episode && <div className="flex items-baseline gap-2 text-sm text-gray">
                <EpisodeLabel season={activity.episode.season_number} episode={activity.episode.episode_number}/>
                {activity.episode.name}
            </div>}
        </Link>
        <Link href={`/users/${activity.user.id}`} className="flex items-center gap-2 min-w-0 ml-4">
            <ProfilePicture size={3} user={activity.user}/>
            <span className="font-semibold truncate">{activity.user.username}</span>
        </Link>
        <div className="flex items-center justify-end gap-4 ml-auto">
            {activity.rewatch && <span title={tMedia("rewatch")} className="flex items-center gap-1 text-sm">
                <RewatchIcon/>
                {tMedia("rewatch")}
            </span>}
            {activity.watched_at && <SmallText>{new Date(activity.watched_at).toLocaleDateString(locale, {day: "numeric", month: "long", year: "numeric"})}</SmallText>}
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

export function FriendActivityCard({activity}: {activity: iMediaActivity}) {
    const {user} = useAuth();
    const tMedia = useTranslations("media");
    const locale = useLocale();
    const {onContextMenu, menu} = useMediaRightClick(activity);

    return (<div className="flex flex-col min-w-0">
        {menu}
        <Link href={formatURL(activity)} title={activity.title} className="group relative aspect-3/2 overflow-hidden border" onContextMenu={onContextMenu}>
            <LoadingImage className="size-full object-cover" width={400} height={225} src={getImage(activity, user?.group_series ?? true)} alt={tMedia("posterAlt", {title: activity.title})}/>
            <div className="custom-noise opacity-30"/>
            <div className="bg-gradient"/>
            {activity.episode && <div className="hidden group-hover:flex absolute inset-0 p-2 items-end justify-center">
                <div className="bg-gradient"/>
                <EpisodeLabel season={activity.episode.season_number} episode={activity.episode.episode_number} className="z-10 text-white"/>
            </div>}
        </Link>
        <Link href={`/users/${activity.user.id}`} className="group/user flex items-center gap-2 min-w-0 p-1.5">
            <ProfilePicture size={3} user={activity.user}/>
            <div className="flex flex-col min-w-0 leading-4">
                <span className="font-semibold text-sm truncate group-hover/user:text-dblack-light">{activity.user.username}</span>
                {activity.watched_at && <span className="text-xs text-gray truncate">{formatRelativeDate(activity.watched_at, locale)}</span>}
            </div>
            {activity.rewatch && <div title={tMedia("rewatch")} className="ml-auto shrink-0">
                <RewatchIcon/>
            </div>}
        </Link>
    </div>);
}
