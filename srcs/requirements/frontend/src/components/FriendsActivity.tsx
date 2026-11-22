"use client";

import React, {useEffect, useRef, useState} from "react";
import {useLocale, useTranslations} from "next-intl";
import SmallText from "@/components/ui/SmallText";
import {Link} from "@/i18n/navigation";
import formatURL from "@/utils/formatURL";
import LoadingImage from "@/components/ui/LoadingImage";
import HoverEffect from "@/components/ui/HoverEffect";
import ProfilePicture from "@/components/ProfilePicture";
import {UserContextMenu} from "@/components/UserRightClick";
import EpisodeLabel from "@/components/EpisodeLabel";
import {TitleMedia} from "@/components/Title";
import {iMediaActivity} from "@/types/media";
import {EyeIcon, RewatchIcon} from "@/components/Icons";
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
                <UserContextMenu user={activity.user}><Link href={`/users/${activity.user.id}`} className="flex items-center gap-2 min-w-0 lg:ml-4">
                    <ProfilePicture size={3} user={activity.user}/>
                    <span className="hidden sm:block font-semibold truncate">{activity.user.username}</span>
                </Link></UserContextMenu>
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

export function getMediaKey(activity: iMediaActivity) {
    return `${activity.type}-${activity.id}`;
}

export function groupActivities(activities: iMediaActivity[]) {
    const episodes = new Map<string, iMediaActivity[]>();

    activities.forEach((activity) => {
        const episode = episodes.get(getActivityKey(activity)) ?? [];

        if (!episode.some((other) => other.user.id === activity.user.id))
            episode.push(activity);
        episodes.set(getActivityKey(activity), episode);
    });

    const stacks = new Map<string, iMediaActivity[]>();
    episodes.forEach((episode) => {
        const users = episode.map((activity) => activity.user.id).sort().join(",");
        const season = episode[0].episode?.season_number ?? "";
        const key = `${getMediaKey(episode[0])}/${season}/${users}`;

        stacks.set(key, [...(stacks.get(key) ?? []), ...episode]);
    });
    return [...stacks.values()];
}

function formatEpisodeNumber(episode: number) {
    return `E${String(episode).padStart(2, "0")}`;
}

const STACK_OFFSET = 10;
const STACK_OFFSET_HOVER = 44;
const MAX_STACK = 4;
const MAX_AVATARS = 3;

export function FriendActivityCard({activities}: {activities: iMediaActivity[]}) {
    const tMedia = useTranslations("media");
    const locale = useLocale();
    const media = activities[0];
    const {onContextMenu, menu} = useMediaRightClick(media);

    const episodes = media.episode ? [...new Map(activities.map((activity) => [getActivityKey(activity), activity])).values()] : [];
    const stack = episodes.slice(0, MAX_STACK);
    const users = activities.filter((activity, index) => activities.findIndex((other) => other.user.id === activity.user.id) === index);
    const hiddenUsers = users.length - MAX_AVATARS;

    const href = formatURL(media) + (media.episode ? `?season=${media.episode.season_number}&episode=${media.episode.episode_number}` : "");
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open)
            return;
        const close = (e: PointerEvent) => {
            if (!ref.current?.contains(e.target as Node))
                setOpen(false);
        };
        document.addEventListener("pointerdown", close);
        return () => document.removeEventListener("pointerdown", close);
    }, [open]);

    // On touch screens there is no hover: the first tap opens the stack, the second one follows the link (the stack is hidden on small screens)
    const onFrontClick = (e: React.MouseEvent) => {
        if (open || stack.length === 0 || !window.matchMedia("(hover: none) and (min-width: 40rem)").matches)
            return;
        e.preventDefault();
        setOpen(true);
    };

    return (<div ref={ref} data-open={open || undefined} onContextMenu={onContextMenu}
                 className="group shrink-0 sm:pr-(--stack-pad) sm:hover:mr-(--stack-extra) sm:data-open:mr-(--stack-extra) transition-[margin] duration-300 ease-out"
                 style={{"--stack-pad": `${stack.length * STACK_OFFSET}px`, "--stack-extra": `${stack.length * (STACK_OFFSET_HOVER - STACK_OFFSET)}px`} as React.CSSProperties}>
        {menu}
        <div className="relative isolate w-[78vw] sm:w-80 xl:w-96">
            {stack.map((episode, index) => <FriendActivityEpisodeLayer key={getActivityKey(episode)} episode={episode} index={index}/>)}
            <Link href={href} title={media.title} className="block relative aspect-3/2" onClick={onFrontClick}>
                <HoverEffect className="absolute inset-0" innerClassName="overflow-hidden border">
                    <LoadingImage className="size-full object-cover" width={400} height={225} src={media.backdrop_url} alt={tMedia("posterAlt", {title: media.title})}/>
                    <div className="absolute inset-0 p-4 flex items-end">
                        <div className="custom-noise"/>
                        <div className="bg-gradient"/>
                        <div className="w-full z-10 text-white text-center">
                            {media.episode && <EpisodeLabel season={media.episode.season_number}/>}
                            <TitleMedia media={media} tag="h3" clickable={true} white={true} className="pl-[8%] justify-center text-3xl! sm:text-4xl!" expClassName="text-base sm:text-lg"/>
                        </div>
                    </div>
                    {media.watched_at && <span title={media.rewatch ? tMedia("rewatch") : undefined}
                                               className="absolute -top-px -left-px z-10 flex items-center gap-1 px-2 py-1 border-b border-r bg-white text-black text-xs font-bold leading-4 max-sm:hidden opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-200">
                        {media.rewatch ? <RewatchIcon size={11}/> : <EyeIcon size={13}/>}
                        {formatRelativeDate(media.watched_at, locale)}
                    </span>}
                </HoverEffect>
            </Link>
            <div className="absolute top-1.5 right-1.5 z-10 flex items-center -space-x-2">
                {users.slice(0, MAX_AVATARS).map((activity) => <UserContextMenu key={activity.user.id} user={activity.user}>
                    <Link href={`/users/${activity.user.id}`} className="shrink-0 hover:z-10"
                          title={activity.user.username + (activity.watched_at ? ` · ${formatRelativeDate(activity.watched_at, locale)}` : "")}>
                        <ProfilePicture size={3} user={activity.user}/>
                    </Link>
                </UserContextMenu>)}
                {hiddenUsers > 0 && <span className="size-8 flex items-center justify-center rounded-full border bg-black text-white text-xs font-semibold"
                                          title={users.slice(MAX_AVATARS).map((activity) => activity.user.username).join(", ")}>+{hiddenUsers}</span>}
            </div>
        </div>
    </div>);
}

function FriendActivityEpisodeLayer({episode, index}: {episode: iMediaActivity, index: number}) {
    const tSerie = useTranslations("serie");
    const {onContextMenu, menu} = useMediaRightClick(episode);
    const {season_number, episode_number, name, poster_url} = episode.episode!;

    return (<>
        {menu}
        <Link href={`${formatURL(episode)}?season=${season_number}&episode=${episode_number}`} title={formatEpisodeNumber(episode_number) + (name ? ` · ${name}` : "")}
                  onContextMenu={(e) => {
                      e.stopPropagation();
                      onContextMenu(e);
                  }}
                  className="group/layer absolute inset-0 z-(--layer-z) hover:z-20 max-sm:hidden sm:scale-y-[0.88] hover:scale-y-100
                             sm:translate-x-(--stack-x) sm:group-hover:translate-x-(--stack-hover) sm:group-data-open:translate-x-(--stack-hover) transition-[translate] duration-300 ease-out"
                  style={{"--stack-x": `${(index + 1) * STACK_OFFSET}px`, "--stack-hover": `${(index + 1) * STACK_OFFSET_HOVER}px`, "--layer-z": -1 - index} as React.CSSProperties}>
        <HoverEffect className="absolute inset-0" innerClassName="overflow-hidden border bg-black">
            <LoadingImage className="size-full object-cover brightness-(--layer-brightness) group-hover/layer:brightness-100"
                          style={{"--layer-brightness": `${75 - index * 12}%`} as React.CSSProperties} width={400} height={225}
                          src={poster_url || episode.backdrop_url} alt={tSerie("altEpisode", {episode: episode_number, season: season_number, title: episode.title})}/>
            <div className="custom-noise opacity-30"/>
            <span className="absolute -top-px -right-px z-10 px-1.5 py-0.5 border-b border-l bg-white text-black text-xs font-bold leading-4 opacity-0 group-hover:opacity-100 group-data-open:opacity-100 transition-opacity duration-200 group-hover:delay-100 group-data-open:delay-100">
                {formatEpisodeNumber(episode_number)}
            </span>
            {name && <div className="absolute inset-0 flex items-end p-2 opacity-0 group-hover/layer:opacity-100">
                <div className="bg-gradient"/>
                <p className="relative w-full text-xs opacity-70 text-white text-center truncate">{name}</p>
            </div>}
        </HoverEffect>
    </Link>
    </>);
}
