"use client";

import {useLocale, useTranslations} from "next-intl";
import SmallText from "@/components/ui/SmallText";
import useAuth from "@/contexts/AuthContext";
import {Link} from "@/i18n/navigation";
import {useFollowingActivity} from "@/services/users.service";
import {SEARCH_FRIENDS} from "@/services/medias.service";
import formatURL from "@/utils/formatURL";
import LoadingImage from "@/components/ui/LoadingImage";
import ProfilePicture from "@/components/ProfilePicture";
import EpisodeLabel from "@/components/EpisodeLabel";
import {iMediaActivity} from "@/types/media";
import {RewatchIcon} from "@/components/Icons";

function getImage(activity: iMediaActivity, groupSeries: boolean) {
    return (!groupSeries && activity.episode?.poster_url) || activity.backdrop_url;
}

export default function FriendsActivity({className}: {className?: string}) {
    const {user} = useAuth();
    const t = useTranslations("home");
    const groupSeries = user?.group_series ?? true;
    const {data} = useFollowingActivity(user?.id, groupSeries);
    const activities = (data?.results ?? []).filter((activity) => getImage(activity, groupSeries));

    if (activities.length === 0)
        return null;

    return (<section className={"flex flex-col gap-2 " + (className ?? "")}>
        <Link className="uppercase font-wide text-lg sm:text-xl font-bold hover:text-black-light" href={`/search?type=${activities[0].type}&q=${encodeURIComponent(SEARCH_FRIENDS)}`}>{t("friendsActivity") + " >"}</Link>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-x-2 sm:gap-x-4 grid-rows-1 auto-rows-[0] overflow-hidden">
            {activities.map((activity, index) => <FriendActivityCard key={index} activity={activity}/>)}
        </div>
    </section>);
}

export function FriendsActivityList({activities}: {activities?: iMediaActivity[]}) {
    const tMedia = useTranslations("media");
    const locale = useLocale();

    return (<div className="divide-gray divide-y lg:grid lg:grid-cols-[auto_auto_auto_1fr]">
        {activities?.map((activity, index) => (<div key={index} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3 lg:grid lg:grid-cols-subgrid lg:col-span-full">
            <div className="flex gap-4">
                <Link href={formatURL(activity)} title={activity.title} className="relative w-38 aspect-3/2 shrink-0 overflow-hidden border">
                    <LoadingImage className="size-full object-cover" width={400} height={225} src={activity.backdrop_url} alt={tMedia("posterAlt", {title: activity.title})}/>
                    <div className="custom-noise opacity-30"/>
                </Link>
                {activity.episode?.poster_url && <Link href={formatURL(activity)} title={activity.episode.name} className="relative w-38 aspect-3/2 shrink-0 overflow-hidden border">
                    <LoadingImage className="size-full object-cover" width={400} height={225} src={activity.episode.poster_url} alt={tMedia("posterAlt", {title: activity.episode.name ?? activity.title})}/>
                    <div className="custom-noise opacity-30"/>
                </Link>}
            </div>
            <Link href={formatURL(activity)} className="flex flex-wrap items-baseline gap-x-2 min-w-0 lg:max-w-md group">
                <span className="font-semibold uppercase group-hover:underline">{activity.title}</span>
                {activity.episode && <div className="flex items-baseline gap-2 text-sm text-gray">
                    <EpisodeLabel season={activity.episode.season_number} episode={activity.episode.episode_number}/>
                    {activity.episode.name}
                </div>}
            </Link>
            <Link href={`/users/${activity.user.id}`} className="flex items-center gap-2 min-w-0 group ml-4">
                <ProfilePicture size={3} user={activity.user}/>
                <span className="font-semibold truncate group-hover:underline">{activity.user.username}</span>
            </Link>
            <div className="flex items-center justify-end gap-4 ml-auto">
                {activity.rewatch && <span title={tMedia("rewatch")} className="flex items-center gap-1 text-sm">
                    <RewatchIcon/>
                    {tMedia("rewatch")}
                </span>}
                {activity.watched_at && <SmallText>{new Date(activity.watched_at).toLocaleDateString(locale, {day: "numeric", month: "long", year: "numeric"})}</SmallText>}
            </div>
        </div>))}
    </div>);
}

function FriendActivityCard({activity}: {activity: iMediaActivity}) {
    const {user} = useAuth();
    const tMedia = useTranslations("media");

    return (<div className="flex flex-col gap-2 min-w-0">
        <Link href={formatURL(activity)} title={activity.title} className="group relative aspect-3/2 overflow-hidden border">
            <LoadingImage className="size-full object-cover" width={400} height={225} src={getImage(activity, user?.group_series ?? true)} alt={tMedia("posterAlt", {title: activity.title})}/>
            <div className="custom-noise opacity-30"/>
            {activity.episode && <div className="hidden group-hover:flex absolute inset-0 p-2 items-end justify-center">
                <div className="bg-gradient"/>
                <EpisodeLabel season={activity.episode.season_number} episode={activity.episode.episode_number} className="z-10 text-white"/>
            </div>}
        </Link>
        <div className="flex justify-between items-center px-1.5">
            <Link href={`/users/${activity.user.id}`} className="flex items-center gap-2 min-w-0">
                <ProfilePicture size={3} user={activity.user}/>
                <span className="font-semibold text-sm truncate">{activity.user.username}</span>
            </Link>
            {activity.rewatch && <div title={tMedia("rewatch")}>
                <RewatchIcon/>
            </div>}
        </div>
    </div>);
}
