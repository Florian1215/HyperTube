"use client";

import {iMovieDetails} from "@/types/movie";
import React, {useEffect, useState} from "react";
import CommentSection from "@/components/Comments";
import MovieInfoSection from "@/app/[locale]/movies/[id]/MovieInfoSection";
import MoviesHero from "@/components/MovieHero";
import {getMovie} from "@/services/movies";
import {Locale, useLocale, useTranslations} from "next-intl";
import {useParams} from "next/navigation";

export default function MoviePage() {
    const params = useParams();
    const [movie, setMovie] = useState<iMovieDetails | null | undefined>(null);
    const id = String(params.id);
    const t = useTranslations("movie");
    const locale = useLocale() as Locale;

    useEffect(() => {
        async function loadMovie() {
            try {
                const data = await getMovie(id, locale);
                data.data.backdrop_url = data.data.backdrop_url.replace("/w500/", "/original/");
                setMovie(data.data);
            } catch (error) {
                console.error(error);
                setMovie(undefined);
            }
        }
        loadMovie();
    }, [id, locale]);

    if (movie === undefined)
        return (<p className="small-text">{t("noResult")}</p>);

    return (<div className="flex flex-col gap-4 sm:gap-6 xl:gap-10">
        <MoviesHero movie={movie} items={[]} onClick={() => console.log('play movie')} />
        {movie && <MovieInfoSection movie={movie}/>}
        {movie && <CommentSection movie={movie} />}
    </div>);
}
