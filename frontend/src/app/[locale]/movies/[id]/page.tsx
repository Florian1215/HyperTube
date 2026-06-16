"use client";

import React, {useEffect, useState} from "react";
import {useParams} from "next/navigation";
import {startStreamingTorrent, useMovie, useTorrents} from "@/services/movies.service";
import useHandleError from "@/hooks/useHandleError";
import {ApiError} from "@/services/ApiError";
import MovieHero from "@/components/features/movie/MovieHero";
import MovieInfoSection from "@/components/features/movie/MovieInfoSection";
import CommentsSection from "@/components/features/comment/CommentsSection";
import getBestTorrent from "@/utils/getBestTorrent";

export default function MoviePage() {
    const params = useParams();
    const id = params.id as string;
    const {data, error} = useMovie(id);
    const [errorNode, setErrorNode] = useState<React.ReactNode>(null);
    const handleError = useHandleError();
    const [getTorrents, setGetTorrents] = useState(false);
    const {data: torrents} = useTorrents(data?.data?.imdb_id, getTorrents)

    useEffect(() => {
        if (error) {
            const node = handleError(error as ApiError, "Film");
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setErrorNode(node);
        }
    }, [error, handleError]);

    useEffect(() => {
        if (torrents) {
            const selectedTorrent = getBestTorrent(torrents.data);
            console.log(selectedTorrent);
            if (selectedTorrent) {
                try {
                    const data = startStreamingTorrent(selectedTorrent.id);
                    console.log(data.then(d => console.log(d)));
                } catch (e) {
                    console.log("ERROR REQUEST", e);// todo handle error
                }
            }
        }
    }, [torrents]);

    if (errorNode)
        return (errorNode);

    const handleTorrent = () => {
        if (!getTorrents) {
            setGetTorrents(true);
        }
    }

    // todo add many backdrops
    return (<div className="flex flex-col gap-4 sm:gap-6 xl:gap-10">
        <MovieHero movie={data?.data} onClick={handleTorrent} />
        <MovieInfoSection movie={data?.data}/>
        {data ? <CommentsSection movie={data.data} /> : <div />}
    </div>);
}
