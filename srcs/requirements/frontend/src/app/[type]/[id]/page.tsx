"use client";

import React, {useEffect, useState} from "react";
import {useParams} from "next/navigation";
import {torrentStreaming, torrentStreamStatus, useMedia, useTorrents} from "@/services/medias.service";
import useHandleError from "@/hooks/useHandleError";
import MediaHero from "@/components/MediaHero";
import getBestTorrent from "@/utils/getBestTorrent";
import hasPerm from "@/utils/hasPerm";
import useNotification from "@/contexts/NotificationContext";
import {useTranslations} from "next-intl";
import useAuth from "@/contexts/AuthContext";
import {API_URL, ApiError} from "@/services/apiClient";
import useModal from "@/contexts/ModalContext";
import MediaInfoSection from "@/app/[type]/[id]/MediaInfoSection";
import CommentsSection from "@/app/[type]/[id]/CommentsSection";
import Button from "@/components/ui/Button/Button";
import VideoPlayer from "@/components/ui/VideoPlayer";
import SmallText from "@/components/ui/SmallText";
import SecondaryButton from "@/components/ui/Button/SecondaryButton";
import {iWatchEpisode, tMedia} from "@/types/utils";
import EpisodeLabel from "@/components/EpisodeLabel";
import SerieSeasonsSection from "@/app/[type]/[id]/SerieSeasonsSection";
import MovieCollectionSection from "@/app/[type]/[id]/MovieCollectionSection";
import {useSeason} from "@/services/series.service";
import {iMovieDetails} from "@/types/movie";

export default function MediaPage() {
    const params = useParams();
    const id = params.id as string;
    const type = params.type as tMedia;
    const {user} = useAuth();
    const {data: media, error} = useMedia(type, id);
    const [errorNode, setErrorNode] = useState<React.ReactNode>(null);
    const handleError = useHandleError();
    const [torrentId, setTorrentId] = useState<string | undefined>();
    const [startVideo, setStartVideo] = useState(false);
    const [streamPath, setStreamPath] = useState<string | undefined>();
    const {addNotification} = useNotification();
    const [errorStr, setError] = useState<undefined | string>();
    const tError = useTranslations("notifications.error");
    const {openModal} = useModal();
    const t = useTranslations("media");
    const featureBtn= (media && hasPerm(user, "medias.can_recommend_medias")) ? () => openModal({type: "set-feature", media: media}) : undefined;
    const [selectedEpisode, setSelectedEpisode] = useState<iWatchEpisode>();
    const nextEpisode = media && "next_episode" in media ? media.next_episode : undefined;
    const watchedEpisode: iWatchEpisode = selectedEpisode ?? {
        runtime: nextEpisode?.progress ?? 0,
        episode: nextEpisode?.episode_number ?? 1,
        season: nextEpisode?.season_number ?? 1,
    };
    const {data: torrents, isLoading: torrentsLoading} = useTorrents(media, watchedEpisode.season, watchedEpisode.episode);
    const {data: season} = useSeason(id, watchedEpisode.season, type === "series");
    const episodeDetails = season?.episodes.find((e) => e.episode_number === watchedEpisode.episode);

    useEffect(() => {
        if (error) {
            const node = handleError(error as ApiError, type === "series" ? "Serie" : "Film");
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setErrorNode(node);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [error]);

    useEffect(() => {
        let cancelled = false;
        const startDownloading = async () => {
            if (torrentId) {
                try {
                    const episode = media?.type === "series" ? watchedEpisode.episode : undefined;
                    let res = await torrentStreaming(torrentId, episode);
                    while (!cancelled && !(await fetch(`${API_URL}${res.stream}`)).ok) {
                        if (res.status === "error")
                            throw new Error(res.status);
                        await new Promise((resolve) => setTimeout(resolve, 2000));
                        res = await torrentStreamStatus(torrentId, episode);
                    }
                    if (cancelled)
                        return;
                    setStreamPath(res.stream);
                    setStartVideo(true);
                } catch (error) {
                    if (cancelled)
                        return;
                    if (error instanceof ApiError)
                        addNotification(error.message, "error");
                    else
                        addNotification(tError("unknown"), "error");
                    setTorrentId(undefined);
                }
            }
        }

        startDownloading().then(() => {});
        return () => {cancelled = true;};
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [torrentId]);

    if (errorNode)
        return (errorNode);

    const closePlayer = () => {
        setStartVideo(false);
        setTorrentId(undefined);
        setStreamPath(undefined);
        setError(undefined);
    }

    const startTorrent = (selectTorrentId: string) => {
        if (media?.type === "series")
            setSelectedEpisode(watchedEpisode);
        setTorrentId(selectTorrentId);
    }

    const selectEpisode = (episode: iWatchEpisode) => {
        closePlayer();
        setSelectedEpisode(episode);
    }

    const getFollowingEpisode = (): iWatchEpisode | undefined => {
        if (media?.type !== "series" || !season)
            return undefined;
        const next = season.episodes.filter((e) => e.episode_number > watchedEpisode.episode).sort((a, b) => a.episode_number - b.episode_number)[0];
        if (next) {
            if (next.release_date && next.release_date > new Date().toISOString().slice(0, 10))
                return undefined;
            return {runtime: next.complete ? 0 : next.progress, episode: next.episode_number, season: watchedEpisode.season};
        }
        if ("number_of_seasons" in media && watchedEpisode.season < media.number_of_seasons)
            return {runtime: 0, episode: 1, season: watchedEpisode.season + 1};
        return undefined;
    }
    const followingEpisode = getFollowingEpisode();

    const showFollowingEpisode = () => {
        if (followingEpisode)
            selectEpisode(followingEpisode);
        else
            closePlayer();
    }

    const handleTorrent = async () => {
        const selectedTorrent = getBestTorrent(torrents?.results);
        if (torrents && selectedTorrent)
            startTorrent(selectedTorrent.id);
        else
            addNotification(tError("torrentNotFound"), "error");
    }

    const handleRightClick = (e?: React.MouseEvent<HTMLDivElement>) => {
        e?.preventDefault();
        openModal({type: "select-torrent", torrents: torrents?.results, setTorrentId: startTorrent});
    };

    const onClick = !torrentsLoading && getBestTorrent(torrents?.results) ? handleTorrent : undefined;
    const runtime = media?.type === "series" ? episodeDetails?.runtime : (media as iMovieDetails | undefined)?.runtime;
    const resumeAt = media?.type === "series" ? watchedEpisode.runtime : (media && !media.complete ? media.progress : 0);

    return (<div className="flex flex-col gap-4 sm:gap-6 xl:gap-10">
        <MediaHero media={media} childrenAction={() => {
            if (errorStr || !media)
                return undefined;
            if (startVideo && streamPath && runtime !== undefined) {
                const isSerie = media.type === "series";
                return <VideoPlayer key={streamPath} media={media} user={user} src={`${API_URL}${streamPath}`} runtime={runtime ?? 0}
                                    startAt={resumeAt}
                                    seasonNumber={isSerie ? watchedEpisode.season : undefined} episodeNumber={isSerie ? watchedEpisode.episode : undefined} episodeName={isSerie ? episodeDetails?.name : undefined}
                                    setErrorAction={setError} tAction={t} nextEpisodeAction={followingEpisode ? showFollowingEpisode : undefined} endedAction={isSerie ? showFollowingEpisode : undefined}/>;
            }
            return <div className={"size-full z-10 absolute" + (onClick ? " custom-cursor-play" : "")} onClick={onClick}/>;}
        } actionButton={() => {
            if (startVideo || torrentId)
                return undefined;
            return (<div className="relative z-30">
                {media?.type === "series" && <EpisodeLabel season={watchedEpisode.season} episode={watchedEpisode.episode}/>}
                <SecondaryButton className="my-2 xl:my-4 font-bold md:h-12" onClick={onClick} onContextMenu={handleRightClick}>{t(resumeAt > 0 ? "resume" : "watch")}</SecondaryButton>
                {featureBtn && <SecondaryButton className="my-2 xl:my-4 font-bold md:h-12 border-l" onClick={featureBtn}>{t("setFeature")}</SecondaryButton>}
            </div>);}
        }>
            {errorStr && <div className="size-full absolute inset-0 bg-black/80 flex items-center justify-center overflow-hidden">
                <div
                    className="max-w-4/5 sm:max-w-130 bg-white border p-3 sm:p-8 shadow-2xl text-center space-y-2 sm:space-y-4">
                    <p className="text-sm sm:text-xl font-medium text-red">{t("torrentError", {type})}</p>
                    <SmallText className="mb-4 sm:mb-6">{errorStr}</SmallText>
                    <Button onClick={() => setError(undefined)}>{t("reloadPlayer")}</Button>
                </div>
            </div>}

            {torrentId && !errorStr && <div className="custom-loading-dark opacity-80" />}

            {torrentId && !startVideo && <div className="absolute mx-auto w-full text-center bottom-1/20 max-w-70">
                <SmallText className="my-2 xl:my-4 text-white">{t("mediaDownloading", {type})}</SmallText>
            </div>}
        </MediaHero>
        <MediaInfoSection media={media}/>
        {media && media.type === "series" && "next_episode" in media && <SerieSeasonsSection serie={media} watchedEpisode={watchedEpisode} setWatchedEpisode={selectEpisode}/>}
        {media && media.type === "movies" && <MovieCollectionSection key={media.id} media={media}/>}
        {media ? <CommentsSection media={media}/> : <div/>}
    </div>);
}
