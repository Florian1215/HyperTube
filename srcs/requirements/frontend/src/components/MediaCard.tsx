import {useTranslations} from "next-intl";
import {iUser} from "@/types/user";
import React, {useState} from "react";
import LoadingImage from "@/components/ui/LoadingImage";
import MediaWatchProgress from "@/components/MediaWatchProgress";
import {Link} from "@/i18n/navigation";
import {EyeIcon} from "@/components/Icons";
import MediaRightClick from "@/components/MediaRightClick";
import EpisodeLabel from "@/components/EpisodeLabel";
import {TitleMedia} from "@/components/Title";
import {iAxe} from "@/types/utils";
import {iMedia} from "@/types/media";
import formatURL from "@/utils/formatURL";
import useFormatDate from "@/utils/formatDate";

export default function MediaCard({media, user, className, showTitle=true, inHistory=false} : {media?: iMedia, user?: iUser, className?: string, showTitle?: boolean, inHistory?: boolean}) {
    const t = useTranslations("media");
    const containerClass = "relative aspect-10/7 overflow-hidden border";
    const [contextMenu, setContextMenu] = useState<iAxe>();
    const watchedAt = useFormatDate(media?.watched_at);

    const handleContextMenu = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
        });
    };

    if (!media) {
        return (<div className={containerClass}>
            <div className="custom-loading"/>
        </div>);
    }

    const episode = inHistory ? media.episode : undefined;

    return (<Link href={formatURL(media)} className={containerClass + " group " + className} onContextMenu={handleContextMenu}>
        {user && media && <MediaRightClick user={user} media={media} contextMenu={contextMenu} setContextMenu={setContextMenu}
            seasonNumber={episode?.season_number}
            episodeNumber={episode?.episode_number}/>}
        <LoadingImage key={episode?.poster_url || media.backdrop_url} className="size-full object-cover transition-transform duration-200"
               width={1000} height={1000} src={episode?.poster_url || media.backdrop_url} alt={t("posterAlt", {title: media.title})} loading="eager"
        />
        <MediaWatchProgress user={user} media={media} />
        <div className="absolute inset-0 p-4 flex items-end">
            <div className="custom-noise" />
            <div className={media.complete ? "custom-complete-media" : "bg-gradient"} />
            {showTitle &&
                <div className="w-full z-10 text-white text-center">
                    {episode && <EpisodeLabel season={episode.season_number} episode={episode.episode_number}/>}
                    <TitleMedia media={media} tag="h3" clickable={true} className="pl-[8%] justify-center" expClassName="xl:text-xl text-xl"/>
                </div>}
        </div>
        {inHistory && media.watched_at && <div className="hidden group-hover:flex absolute items-center top-1 right-2 z-10 gap-2">
            <EyeIcon size={20} color="white"/>
            <p className="text-white text-sm font-bold">{watchedAt}</p>
        </div>}
    </Link>);
}
