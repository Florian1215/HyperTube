"use client";

import React, {useEffect, useState} from "react";
import MovieInfoSection from "@/app/[locale]/movies/[id]/MovieInfoSection";
import MoviesHero from "@/components/MovieHero";
import {useParams} from "next/navigation";
import {useMovie} from "@/api/movies";
import {CommentSection} from "@/components/Comments";
import {ApiError} from "@/api/errors";
import {useHandleError} from "@/hooks/useApiQuery";

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
        <MoviesHero movie={data?.data} items={[]} onClick={() => console.log("play movie")} />
        {data && <MovieInfoSection movie={data.data}/>}
        {data && <CommentSection movie={data.data} />}
    </div>);
}
