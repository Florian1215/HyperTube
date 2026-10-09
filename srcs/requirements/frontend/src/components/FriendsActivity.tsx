"use client";

import {useTranslations} from "next-intl";
import useAuth from "@/contexts/AuthContext";
import {Link} from "@/i18n/navigation";
import {useFollowingActivity} from "@/services/users.service";
import formatURL from "@/utils/formatURL";
import HorizontalScroll from "@/components/ui/HorizontalScroll";
import LoadingImage from "@/components/ui/LoadingImage";
import ProfilePicture from "@/components/ProfilePicture";
import EpisodeLabel from "@/components/EpisodeLabel";
import {iMediaActivity} from "@/types/media";

export default function FriendsActivity({className}: {className?: string}) {
    const {user} = useAuth();
    const t = useTranslations("home");
    const tMedia = useTranslations("media");
    const groupSeries = user?.group_series ?? true;
    const {data} = useFollowingActivity(user?.id, groupSeries);
    const getImage = (activity: iMediaActivity) => (!groupSeries && activity.episode?.poster_url) || activity.backdrop_url;
    const activities = (data?.results ?? []).filter(getImage);

    if (activities.length === 0)
        return null;

    return (<section className={"flex flex-col gap-2 " + (className ?? "")}>
        <span className="uppercase font-wide text-lg sm:text-xl font-bold">{t("friendsActivity")}</span>
        <HorizontalScroll className="gap-2 sm:gap-4">
            {activities.map((activity, index) => (<div key={index} className="flex flex-col gap-2 w-34 sm:w-42 shrink-0">
                <Link href={formatURL(activity)} title={activity.title} className="group relative aspect-3/2 overflow-hidden border">
                    <LoadingImage className="size-full object-cover" width={400} height={225} src={getImage(activity)} alt={tMedia("posterAlt", {title: activity.title})}/>
                    <div className="custom-noise opacity-30"/>
                    {activity.episode && <div className="hidden group-hover:flex absolute inset-0 p-2 items-end justify-center">
                        <div className="bg-gradient"/>
                        <EpisodeLabel season={activity.episode.season_number} episode={activity.episode.episode_number} className="z-10 text-white"/>
                    </div>}
                </Link>
                <Link href={`/users/${activity.user.id}`} className="flex items-center gap-2 min-w-0 ml-1">
                    <ProfilePicture size={3} user={activity.user}/>
                    <span className="font-semibold text-sm truncate">{activity.user.username}</span>
                </Link>
            </div>))}
        </HorizontalScroll>
    </section>);
}
