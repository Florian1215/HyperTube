import React, {useState} from "react";
import Title from "@/components/Title";
import {iEpisode, iSerieDetails} from "@/types/serie";
import {useSeason} from "@/services/series.service";
import LoadingImage from "@/components/ui/LoadingImage";
import LoadingText from "@/components/LoadingText";
import {useTranslations} from "next-intl";
import SmallText from "@/components/ui/SmallText";
import useFormatDate from "@/utils/formatDate";
import useAuth from "@/contexts/AuthContext";
import MediaRightClick from "@/components/MediaRightClick";
import MediaWatchProgress from "@/components/MediaWatchProgress";
import {iAxe, iWatchEpisode} from "@/types/utils";
import {iUser} from "@/types/user";
import ExpandableText from "@/components/ui/ExpandableText";
import HorizontalScroll from "@/components/ui/HorizontalScroll";
import RadioButton from "@/components/ui/Button/RadioButton";

export default function SerieSeasonsSection({serie, watchedEpisode, setWatchedEpisode}: {serie: iSerieDetails, watchedEpisode: iWatchEpisode, setWatchedEpisode: (val: iWatchEpisode) => void}) {
    const t = useTranslations("serie");
    const [selectedSeasonNB, setSelectedSeasonNB] = useState(watchedEpisode.season - 1);
    const {data: season} = useSeason(serie.id, selectedSeasonNB + 1);
    const sameDate = season && season.episodes.length > 1 ? season.episodes[0].release_date === season.episodes[season.episodes.length - 1].release_date : false;
    const {user} = useAuth();
    const [contextMenu, setContextMenu] = useState<iAxe>();


    const handleClick = (newVal: iWatchEpisode) => {
        setWatchedEpisode({runtime: newVal.runtime, episode: newVal.episode, season: newVal.season});
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
        });
    };

    return (<div className="mx-auto max-w-2xl w-9/10">
        <Title title={t("seasons")} tag="h2" exp={serie.number_of_seasons}/>
        <HorizontalScroll className="gap-2 py-2">
            {Array.from({length: serie.number_of_seasons}, (_, i) => <RadioButton key={i} selected={selectedSeasonNB === i} onClick={() => setSelectedSeasonNB(i)}>{t("seasonNumber", {number: i + 1})}</RadioButton>)}
        </HorizontalScroll>
        {season ? <div>
            <div>
                <div className="relative border h-50" onContextMenu={handleContextMenu}>
                    {user && <MediaRightClick user={user} media={serie} progress={season} seasonNumber={season.season_number} contextMenu={contextMenu} setContextMenu={setContextMenu}/>}
                    <LoadingImage key={season.poster_url} width={2000} height={200} className="size-full object-cover" src={season.poster_url} alt={t("altSeason", {season: season.season_number, title: serie.title})}/>
                    <MediaWatchProgress user={user} media={season}/>
                    <div className="custom-noise"/>
                    {season.complete && <div className="custom-complete-media"/>}
                </div>
                <div className="flex items-end pb-2 pt-4 gap-4">
                    <h4>{t("episodesCount", {count: season.episodes.length})}</h4>
                    <SmallText className="text-right">{season?.release_date.slice(0, 4)}</SmallText>
                </div>
                <div className="mb-4">
                    <ExpandableText key={season.id} lines={2} className="text-sm text-gray"  showBtn={false}>{season.overview}</ExpandableText>
                </div>
            </div>
            <table className="w-full table-fixed">
                <tbody>
                    {season.episodes.map((episode) => <Episode key={episode.id} episode={episode} serie={serie} seasonNumber={season.season_number} user={user} altPoster={t("altEpisode", {episode: episode.episode_number, season: season.season_number, title: serie.title})} showDate={!sameDate} watchedEpisode={watchedEpisode} handleClick={handleClick}/>)}
                </tbody>
            </table>
        </div> : <div>
            <div className="border h-50">
                <div className="custom-loading"/>
            </div>
            <div className="pb-2 pt-4">
                <LoadingText/>
            </div>
            <div className="flex flex-col gap-1 mb-4">
                <div className="h-4"><div className="custom-loading"/></div>
                <div className="h-4 w-2/3"><div className="custom-loading"/></div>
            </div>
        </div>}
    </div>);
}

function Episode({episode, serie, seasonNumber, user, altPoster, showDate, watchedEpisode, handleClick}: {episode: iEpisode, serie: iSerieDetails, seasonNumber: number, user?: iUser, altPoster: string, showDate: boolean, watchedEpisode: iWatchEpisode, handleClick: (val: iWatchEpisode) => void}) {
    const t = useTranslations("serie");
    const formattedReleaseDate = useFormatDate(episode.release_date);
    const [contextMenu, setContextMenu] = useState<iAxe>();
    const currentEpisode = {runtime: episode.complete ? 0 : episode.progress, episode: episode.episode_number, season: seasonNumber};

    const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
        });
    };

    const isSelected = episode.episode_number === watchedEpisode.episode && seasonNumber === watchedEpisode.season;
    return (<tr>
        <td className={"font-bold text-2xl font-wide text-right pr-1 pl-4 w-14" + (isSelected ? " border-l-5" : "")}>
            <span>{episode.episode_number}</span>
        </td>
        <td className="px-4 w-36 sm:w-50 py-2 align-top custom-cursor-play" onClick={() => handleClick(currentEpisode)}>
            {user && <MediaRightClick user={user} media={serie} progress={episode} seasonNumber={seasonNumber} episodeNumber={episode.episode_number} contextMenu={contextMenu} setContextMenu={setContextMenu}/>}
            <div className="relative border aspect-10/7 overflow-hidden" onContextMenu={handleContextMenu}>
                <LoadingImage className="size-full object-cover" width={200} height={200} src={episode.poster_url} alt={altPoster}/>
                <MediaWatchProgress user={user} media={episode}/>
                <div className="custom-noise opacity-30"/>
                {episode.complete && <div className="custom-complete-media"/>}
            </div>
        </td>
        <td className="align-top pt-5 pb-2">
            <button onClick={() => handleClick(currentEpisode)} title={episode.name} className="block max-w-full font-semibold text-lg uppercase truncate text-left">{episode.name}</button>
            <SmallText className="text-left">{t("minutes", {runtime: episode.runtime})}{showDate ? ` - ${formattedReleaseDate}` : ""}</SmallText>
            <ExpandableText className="text-sm text-gray leading-tight" lines={2} showBtn={false}>{episode.overview}</ExpandableText>
        </td>
    </tr>)
}
