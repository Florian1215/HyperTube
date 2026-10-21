"use client";

import React, {useEffect, useRef, useState} from "react";
import {useParams} from "next/navigation";
import {torrentStreaming, torrentStreamStatus, updateTorrentRequest, useMedia, useTorrentRequest, useTorrents} from "@/services/medias.service";
import useHandleError from "@/hooks/useHandleError";
import MediaHero from "@/components/MediaHero";
import getBestTorrent from "@/utils/getBestTorrent";
import hasPerm from "@/utils/hasPerm";
import useNotification from "@/contexts/NotificationContext";
import {useLocale, useTranslations} from "next-intl";
import useAuth from "@/contexts/AuthContext";
import {API_URL, ApiError} from "@/services/apiClient";
import useModal from "@/contexts/ModalContext";
import MediaInfoSection from "@/app/[type]/[id]/MediaInfoSection";
import CommentsSection from "@/app/[type]/[id]/CommentsSection";
import Button from "@/components/ui/Button/Button";
import VideoPlayer from "@/components/ui/VideoPlayer";
import SmallText from "@/components/ui/SmallText";
import TextButton from "@/components/ui/Button/TextButton";
import {iWatchEpisode, tMedia} from "@/types/utils";
import EpisodeLabel from "@/components/EpisodeLabel";
import SerieSeasonsSection from "@/app/[type]/[id]/SerieSeasonsSection";
import MovieCollectionSection from "@/app/[type]/[id]/MovieCollectionSection";
import {useSeason} from "@/services/series.service";
import {iMovieDetails} from "@/types/movie";
import useWatchlist from "@/hooks/useWatchlist";
import {BookmarkIcon, PlayPauseIcon, StarIcon, TvIcon} from "@/components/Icons";
import {useQueryClient} from "@tanstack/react-query";
import PageMeta from "@/components/PageMeta";
import {castToTv, useTvStatus} from "@/services/tv.service";

const REQUESTABLE_DAYS = 365;

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
    const tSuccess = useTranslations("notifications.success");
    const locale = useLocale();
    const {openModal} = useModal();
    const t = useTranslations("media");
    const tMeta = useTranslations("meta");
    const meta = <PageMeta title={media?.title ?? tMeta("media", {type})} description={media ? (media.summary || tMeta("mediaDescription", {title: media.title})) : undefined}/>;
    const toggleWatchlist = useWatchlist();
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
    const queryClient = useQueryClient();
    const bestTorrent = getBestTorrent(torrents?.results, type === "series", season?.episodes.length);
    const unavailable = !!media && !torrentsLoading && !bestTorrent;
    const releaseDate = media?.type === "series" ? episodeDetails?.release_date : media?.release_date;
    const oldestRequestable = new Date();
    oldestRequestable.setDate(oldestRequestable.getDate() - REQUESTABLE_DAYS);
    const requestable = !releaseDate || releaseDate >= oldestRequestable.toISOString().slice(0, 10);
    const {data: torrentRequest} = useTorrentRequest(media, watchedEpisode.season, watchedEpisode.episode, !!user && unavailable);
    const {data: tvStatus} = useTvStatus(!!user);

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

    const [preloadFollowing, setPreloadFollowing] = useState(false);
    const preloadedTorrent = useRef<string | undefined>(undefined);
    const followingSeasonNumber = followingEpisode?.season ?? watchedEpisode.season;
    const {data: followingTorrents} = useTorrents(preloadFollowing ? media : undefined, followingSeasonNumber, followingEpisode?.episode);
    const {data: followingSeason} = useSeason(id, followingSeasonNumber, preloadFollowing && followingSeasonNumber !== watchedEpisode.season);
    const followingEpisodeCount = (followingSeasonNumber === watchedEpisode.season ? season : followingSeason)?.episodes.length;
    const followingTorrent = getBestTorrent(followingTorrents?.results, true, followingEpisodeCount);

    useEffect(() => {
        if (!preloadFollowing || !followingEpisode || !followingTorrent)
            return;
        const key = `${followingTorrent.id}-${followingEpisode.season}-${followingEpisode.episode}`;

        if (preloadedTorrent.current === key)
            return;
        preloadedTorrent.current = key;
        torrentStreaming(followingTorrent.id, followingEpisode.episode).catch(() => {});
    }, [preloadFollowing, followingEpisode, followingTorrent]);

    const [autoPlay, setAutoPlay] = useState(false);

    useEffect(() => {
        if (!autoPlay || torrentsLoading)
            return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAutoPlay(false);
        if (bestTorrent)
            setTorrentId(bestTorrent.id);
    }, [autoPlay, torrentsLoading, bestTorrent]);

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
                    void queryClient.invalidateQueries({queryKey: ["torrents", media?.type ?? "", media?.id ?? ""]});
                }
            }
        }

        startDownloading().then(() => {});
        return () => {cancelled = true;};
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [torrentId]);

    if (errorNode)
        return (<>{meta}{errorNode}</>);

    const closePlayer = () => {
        setStartVideo(false);
        setTorrentId(undefined);
        setStreamPath(undefined);
        setError(undefined);
        setPreloadFollowing(false);
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

    const showFollowingEpisode = () => {
        if (followingEpisode) {
            selectEpisode(followingEpisode);
            setAutoPlay(true);
        } else
            closePlayer();
    }

    const handleTorrent = async () => {
        if (torrents && bestTorrent)
            startTorrent(bestTorrent.id);
        else
            addNotification(tError("torrentNotFound"), "error");
    }

    const handleRightClick = (e?: React.MouseEvent) => {
        e?.preventDefault();
        openModal({type: "select-torrent", torrents: torrents?.results, bestTorrentId: bestTorrent?.id, setTorrentId: startTorrent});
    };

    const toggleTorrentRequest = async () => {
        if (!media || !torrentRequest)
            return;
        const isSerie = media.type === "series";
        try {
            const res = await updateTorrentRequest(media, !torrentRequest.requested, watchedEpisode.season, watchedEpisode.episode);
            queryClient.setQueriesData({queryKey: ["torrent-request", media.type, media.id, isSerie ? watchedEpisode.season : undefined, isSerie ? watchedEpisode.episode : undefined]}, res);
        } catch (error) {
            addNotification(error instanceof ApiError ? error.message : tError("unknown"), "error");
        }
    }

    const castMedia = async () => {
        if (!media)
            return;
        const isSerie = media.type === "series";
        try {
            await castToTv(locale, media.type, media.id, isSerie ? watchedEpisode.season : undefined, isSerie ? watchedEpisode.episode : undefined);
            addNotification(tSuccess("castSent"), "success");
        } catch (error) {
            addNotification(error instanceof ApiError ? error.message : tError("unknown"), "error");
            void queryClient.invalidateQueries({queryKey: ["tv-status"]});
        }
    }

    const onClick = !torrentsLoading && bestTorrent ? handleTorrent : undefined;
    const runtime = media?.type === "series" ? episodeDetails?.runtime : (media as iMovieDetails | undefined)?.runtime;
    const resumeAt = media?.type === "series" ? watchedEpisode.runtime : (media && !media.complete ? media.progress : 0);

    return (<div className="flex flex-col gap-6 xl:gap-10">
        {meta}
        <MediaHero media={media} childrenAction={() => {
            if (errorStr || !media)
                return undefined;
            if (startVideo && streamPath && runtime !== undefined) {
                const isSerie = media.type === "series";
                return <VideoPlayer key={streamPath} media={media} user={user} src={`${API_URL}${streamPath}`} runtime={runtime ?? 0}
                                    startAt={resumeAt}
                                    seasonNumber={isSerie ? watchedEpisode.season : undefined} episodeNumber={isSerie ? watchedEpisode.episode : undefined} episodeName={isSerie ? episodeDetails?.name : undefined}
                                    setErrorAction={setError} tAction={t} nextEpisodeAction={followingEpisode ? showFollowingEpisode : undefined} nextEpisodeShownAction={() => setPreloadFollowing(true)} endedAction={isSerie ? showFollowingEpisode : undefined}/>;
            }
            return <div className={`size-full z-10 absolute ${onClick ? "custom-cursor-play" : ""}`} onClick={onClick}/>;}
        } actionButton={() => {
            const className = "sm:my-2 xl:my-4 font-bold md:h-12";
            const classNameFlex = `${className} flex items-center gap-1 sm:gap-3.5`;

            if (startVideo || torrentId)
                return undefined;
            return (<div className="relative flex flex-col z-30 items-center">
                {media?.type === "series" && <EpisodeLabel season={watchedEpisode.season} episode={watchedEpisode.episode}/>}
                <div className="flex gap-2 justify-center my-1">
                    <Button variant="secondary" darkMode={false} className={classNameFlex} onClick={onClick} onContextMenu={handleRightClick}><PlayPauseIcon size={20} className="size-3.5 sm:size-5" color={onClick ? "black" : "gray"}/><span>{t(resumeAt > 0 ? "resume" : "watch")}</span></Button>
                    {featureBtn && <Button variant="secondary" darkMode={false} className={`${className} px-2! sm:px-4!`} onClick={featureBtn}><span className="hidden sm:block">{t("setFeature")}</span><span className="block sm:hidden"><StarIcon size={19} color="black"/></span></Button>}
                    {user && media && <Button variant="outline" darkMode={false} className={`${classNameFlex} px-2! sm:px-4!`} onClick={() => void toggleWatchlist(media)}><BookmarkIcon size={20} color="white" filled={media.in_watchlist}/><span className="hidden sm:block">{t("watchlist")}</span></Button>}
                    {user && media && tvStatus?.online && <Button variant="outline" darkMode={false} className={`${classNameFlex} px-2! sm:px-4!`} onClick={() => void castMedia()}><TvIcon size={20} color="white"/><span className="hidden sm:block">{t("castToTv")}</span></Button>}
                </div>
                {unavailable && (requestable || torrentRequest?.requested) && <SmallText italic={false} className="mb-0 sm:mb-2 text-white">
                    {t(torrentRequest?.requested ? "torrentRequested" : "torrentUnavailable", {type})}
                    {torrentRequest && <TextButton className="ml-2 text-white italic hover:text-accent" onClick={() => void toggleTorrentRequest()}>{t(torrentRequest.requested ? "cancelTorrentRequest" : "requestTorrent")}</TextButton>}
                </SmallText>}
            </div>);}
        }>
            {errorStr && <div className="z-30 size-full absolute inset-0 bg-black/80 flex items-center justify-center overflow-hidden">
                <div
                    className="max-w-4/5 sm:max-w-130 bg-white text-black border p-3 sm:p-8 shadow-2xl text-center space-y-2 sm:space-y-4">
                    <p className="text-sm sm:text-xl font-medium text-red">{t("torrentError", {type})}</p>
                    <SmallText className="mb-4 sm:mb-6">{errorStr}</SmallText>
                    <Button darkMode={false} onClick={() => setError(undefined)}>{t("reloadPlayer")}</Button>
                </div>
            </div>}

            {torrentId && !errorStr && <div className="custom-loading-dark opacity-80" />}

            {torrentId && !startVideo && <div className="absolute mx-auto w-full text-center bottom-1/20 max-w-70">
                <SmallText className="my-2 xl:my-4 text-white">{t("mediaDownloading", {type})}</SmallText>
            </div>}
        </MediaHero>
        <MediaInfoSection media={media} watchedBy={(media?.type === "series" ? episodeDetails?.watched_by : media?.watched_by) ?? []}/>
        {media && media.type === "series" && "next_episode" in media && <SerieSeasonsSection serie={media} watchedEpisode={watchedEpisode} setWatchedEpisode={selectEpisode}/>}
        {media && media.type === "movies" && <MovieCollectionSection key={media.id} media={media}/>}
        {media ? <CommentsSection media={media}/> : <div/>}
    </div>);
}
