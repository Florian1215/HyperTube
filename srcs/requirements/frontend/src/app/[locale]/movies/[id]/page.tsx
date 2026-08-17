"use client";

import React, {useEffect, useState} from "react";
import {useParams} from "next/navigation";
import {startTorrentStreaming, useMovie, useTorrents} from "@/services/movies.service";
import useHandleError from "@/hooks/useHandleError";
import MovieHero from "@/components/MovieHero";
import getBestTorrent from "@/utils/getBestTorrent";
import useNotification from "@/contexts/NotificationContext";
import {useTranslations} from "next-intl";
import useAuth from "@/contexts/AuthContext";
import {ApiError} from "@/services/apiClient";
import useModal from "@/contexts/ModalContext";
import MovieInfoSection from "@/app/[locale]/movies/[id]/MovieInfoSection";
import CommentsSection from "@/app/[locale]/movies/[id]/CommentsSection";

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
    const tError = useTranslations("notifications.error");
    const {openModal} = useModal();

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
                    await startTorrentStreaming(torrentId).then(() => {
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

    return (<div className="flex flex-col gap-4 sm:gap-6 xl:gap-10">
        <MovieHero movie={movie} onClick={torrents ? handleTorrent : undefined} torrentId={torrentId} startVideo={startVideo} torrents={torrents?.results} setTorrentId={setTorrentId} watchBtn={true}
                   featureBtn={(movie && user && user.featured) ? () => openModal({type: "set-feature", movie: movie}) : undefined}
        />
        <MovieInfoSection movie={movie}/>
        {movie ? <CommentsSection movie={movie}/> : <div/>}
    </div>);
}
