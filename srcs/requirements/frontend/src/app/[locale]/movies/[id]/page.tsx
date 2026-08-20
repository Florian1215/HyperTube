"use client";

import React, {useEffect, useState} from "react";
import {useParams} from "next/navigation";
import {torrentStreaming, useMovie, useTorrents} from "@/services/movies.service";
import useHandleError from "@/hooks/useHandleError";
import MovieHero from "@/components/MovieHero";
import getBestTorrent from "@/utils/getBestTorrent";
import useNotification from "@/contexts/NotificationContext";
import {useTranslations} from "next-intl";
import useAuth from "@/contexts/AuthContext";
import {API_URL, ApiError} from "@/services/apiClient";
import useModal from "@/contexts/ModalContext";
import MovieInfoSection from "@/app/[locale]/movies/[id]/MovieInfoSection";
import CommentsSection from "@/app/[locale]/movies/[id]/CommentsSection";
import Button from "@/components/ui/Button/Button";
import VideoPlayer from "@/components/ui/VideoPlayer";
import SmallText from "@/components/ui/SmallText";
import SecondaryButton from "@/components/ui/Button/SecondaryButton";

export default function MoviePage() {
    const params = useParams();
    const id = params.id as string;
    const {user} = useAuth();
    const {data: movie, error} = useMovie(id);
    const [errorNode, setErrorNode] = useState<React.ReactNode>(null);
    const handleError = useHandleError();
    const [torrentId, setTorrentId] = useState<string | undefined>();
    const [startVideo, setStartVideo] = useState(false);
    const {data: torrents} = useTorrents(movie?.id)
    const {addNotification} = useNotification();
    const [errorStr, setError] = useState<undefined | string>();
    const tError = useTranslations("notifications.error");
    const {openModal} = useModal();
    const t = useTranslations("movie");
    const featureBtn= (movie && user && user.featured) ? () => openModal({type: "set-feature", movie: movie}) : undefined;

    useEffect(() => {
        if (error) {
            const node = handleError(error as ApiError, "Film");
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setErrorNode(node);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [error]);

    useEffect(() => {
        const startDownloading = async () => {
            if (torrentId) {
                try {
                    await torrentStreaming(torrentId, "POST").then(() => {
                        setStartVideo(true);
                    });
                } catch (error) {
                    if (error instanceof ApiError)
                        addNotification(error.message, "error");
                    else
                        addNotification(tError("unknown"), "error");
                    setTorrentId(undefined);
                }
            }
        }

        startDownloading().then(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [torrentId]);

    if (errorNode)
        return (errorNode);

    const handleTorrent = async () => {
        const selectedTorrent = getBestTorrent(torrents?.results);
        if (torrents && selectedTorrent)
            setTorrentId(selectedTorrent.id);
        else
            addNotification(tError("torrentNotFound"), "error");
    }

    const stopDownloading = async () => {
        if (torrentId) {
            try {
                await torrentStreaming(torrentId, "DELETE").then(() => {
                    setStartVideo(false);
                });
            } catch (error) {
                if (error instanceof ApiError)
                    addNotification(error.message, "error");
                else
                    addNotification(tError("unknown"), "error");
                setTorrentId(undefined);
            }
        }
    }

    const handleRightClick = (e?: React.MouseEvent<HTMLDivElement>) => {
        e?.preventDefault();
        openModal({type: "select-torrent", torrents: torrents?.results, setTorrentId: setTorrentId});
    };

    const onClick = torrents ? handleTorrent : undefined;

    return (<div className="flex flex-col gap-4 sm:gap-6 xl:gap-10">
        <MovieHero movie={movie} childrenAction={() =>
            <>
                <div className="size-full z-20 absolute custom-cursor-play" onClick={onClick}/>
                {movie && startVideo && !errorStr && (<VideoPlayer movie={movie} user={user} src={`${API_URL}stream/${torrentId}/index`} setErrorAction={setError} tAction={t}/>)}
            </>
        } actionButton={() =>
            <div>
                <SecondaryButton className="my-2 xl:my-4 font-bold md:h-12" onClick={onClick} onContextMenu={handleRightClick}>{t("watch")}</SecondaryButton>
                {featureBtn && <SecondaryButton className="my-2 xl:my-4 font-bold md:h-12 border-l" onClick={featureBtn}>{t("setFeature")}</SecondaryButton>}
            </div>
        }>

            {errorStr && <div className="size-full absolute inset-0 bg-black/80 flex items-center justify-center overflow-hidden">
                <div
                    className="max-w-4/5 sm:max-w-130 bg-white border p-4 sm:p-8 shadow-2xl text-center space-y-2 sm:space-y-4">
                    <p className="text-sm sm:text-xl font-semibold text-red">{t("torrentError")}</p>
                    <SmallText>{errorStr}</SmallText>
                    <Button onClick={handleRightClick}>{t("chooseAnotherTorrent")}</Button>
                </div>
            </div>}

            {torrentId && !errorStr && <div className="custom-loading-dark opacity-80" />}

            {torrentId && !startVideo && <div className="absolute mx-auto w-full text-center bottom-1/20 max-w-70">
                <SmallText className="my-2 xl:my-4 text-white">{t("movieDownloading")}</SmallText>
            </div>}
        </MovieHero>
        {startVideo && <div className="px-4 sm:px-6 w-full" ><Button onClick={stopDownloading}>STOP</Button></div>}
        <MovieInfoSection movie={movie}/>
        {movie ? <CommentsSection movie={movie}/> : <div/>}
    </div>);
}
