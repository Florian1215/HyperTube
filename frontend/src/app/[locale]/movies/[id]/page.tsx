"use client";

import React, {useEffect, useState} from "react";
import {useParams} from "next/navigation";
import {useMovie} from "@/services/movies.service";
import useHandleError from "@/hooks/useHandleError";
import {ApiError} from "@/services/ApiError";
import MovieHero from "@/components/features/movie/MovieHero";
import MovieInfoSection from "@/components/features/movie/MovieInfoSection";
import CommentsSection from "@/components/features/comment/CommentsSection";

export default function MoviePage() {
    const params = useParams();
    const id = params.id as string;
    const {data, error} = useMovie(id);
    const [errorNode, setErrorNode] = useState<React.ReactNode>(null);
    const handleError = useHandleError();

    useEffect(() => {
        if (error) {
            const node = handleError(error as ApiError, "Film");
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setErrorNode(node);
        }
    }, [error, handleError]);

    if (errorNode)
        return (errorNode);

    // todo add many backdrops
    return (<div className="flex flex-col gap-4 sm:gap-6 xl:gap-10">
        <MovieHero movie={data?.data} onClick={() => console.log("play movie")} />
        <MovieInfoSection movie={data?.data}/>
        {data ? <CommentsSection movie={data.data} /> : <div />}
    </div>);
}
