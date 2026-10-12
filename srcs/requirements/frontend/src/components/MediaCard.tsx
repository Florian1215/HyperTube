import {useTranslations} from "next-intl";
import {iUser} from "@/types/user";
import React, {useRef, useState} from "react";
import LoadingImage from "@/components/ui/LoadingImage";
import MediaWatchProgress from "@/components/MediaWatchProgress";
import {Link} from "@/i18n/navigation";
import {EyeIcon, RewatchIcon} from "@/components/Icons";
import MediaRightClick from "@/components/MediaRightClick";
import EpisodeLabel from "@/components/EpisodeLabel";
import {TitleMedia} from "@/components/Title";
import {iAxe} from "@/types/utils";
import {iMedia} from "@/types/media";
import formatURL from "@/utils/formatURL";
import useFormatDate from "@/utils/formatDate";

const CARD_SHIFT = 10;

export default function MediaCard({media, user, className, showTitle=true, inHistory=false, showEpisode=false, showProgress=true, label} : {media?: iMedia, user?: iUser, className?: string, showTitle?: boolean, inHistory?: boolean, showEpisode?: boolean, showProgress?: boolean, label?: string}) {
    const t = useTranslations("media");
    const containerClass = "relative aspect-10/7 overflow-hidden border";
    const [contextMenu, setContextMenu] = useState<iAxe>();
    const watchedAt = useFormatDate(media?.watched_at);
    const cardRef = useRef<HTMLDivElement>(null);

    const resetCard = () => {
        ["--card-x", "--card-y", "--pointer-x", "--pointer-y"].forEach((name) => cardRef.current?.style.removeProperty(name));
    };

    // the cursor is hidden on the card: the card follows it slightly and a highlight shows where it is
    const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
        const card = cardRef.current;
        if (!card || contextMenu || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
            return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        card.style.setProperty("--card-x", `${(x - 0.5) * CARD_SHIFT}px`);
        card.style.setProperty("--card-y", `${(y - 0.5) * CARD_SHIFT}px`);
        card.style.setProperty("--pointer-x", `${x * 100}%`);
        card.style.setProperty("--pointer-y", `${y * 100}%`);
    };

    const handleContextMenu = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();

        resetCard();
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

    const episode = (inHistory || showEpisode) ? media.episode : undefined;

    return (<Link href={formatURL(media)} className={`block relative w-full aspect-10/7 group hover:z-10 ${contextMenu ? "" : "motion-safe:cursor-none motion-safe:[&_*]:cursor-none"} ${className}`}
                  onContextMenu={handleContextMenu} onMouseMove={handleMouseMove} onMouseLeave={resetCard}>
        {user && media && <MediaRightClick user={user} media={media} contextMenu={contextMenu} setContextMenu={setContextMenu}
            seasonNumber={episode?.season_number}
            episodeNumber={episode?.episode_number}/>}
        <div ref={cardRef} className={`absolute inset-0 overflow-hidden border transition-transform duration-150 ease-out motion-reduce:transition-none ${contextMenu ? "" : "motion-safe:group-hover:[--card-scale:1.03]"}`}
             style={{transform: "translate(var(--card-x, 0px), var(--card-y, 0px)) scale(var(--card-scale, 1))"}}>
        <LoadingImage key={episode?.poster_url || media.backdrop_url} className="size-full object-cover transition-transform duration-200"
               width={1000} height={1000} src={episode?.poster_url || media.backdrop_url} alt={t("posterAlt", {title: media.title})} loading="eager"
        />
        {showProgress && <MediaWatchProgress user={user} media={media} />}
        <div className="absolute inset-0 p-4 flex items-end">
            <div className="custom-noise" />
            <div className={media.complete && showProgress ? "custom-complete-media" : "bg-gradient"} />
            {showTitle &&
                <div className="w-full z-10 text-white text-center">
                    {label && <p className="text-xs opacity-70 truncate">{label}</p>}
                    {episode && <EpisodeLabel season={episode.season_number} episode={episode.episode_number}/>}
                    <TitleMedia media={media} tag="h3" clickable={true} white={true} className="pl-[8%] justify-center" expClassName="xl:text-xl text-xl"/>
                </div>}
        </div>
        {inHistory && media.watched_at && <div className="hidden group-hover:flex absolute items-center top-1 right-2 z-10 gap-2">
            {media.rewatch ? <RewatchIcon color="white"/> : <EyeIcon size={20} color="white"/>}
            <p className="text-white text-sm font-bold">{watchedAt}</p>
        </div>}
        <div className="absolute inset-0 pointer-events-none opacity-0 motion-safe:group-hover:opacity-20 transition-opacity duration-150"
             style={{background: "radial-gradient(circle at var(--pointer-x, 50%) var(--pointer-y, 50%), rgb(255 255 255 / 0.2), transparent 55%)"}}/>
        </div>
    </Link>);
}
