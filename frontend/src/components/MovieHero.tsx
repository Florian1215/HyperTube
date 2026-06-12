import React, {useCallback, useEffect, useRef, useState} from "react";
import Image from "next/image";
import {iMovie} from "@/types/movie";
import {SecondaryButton} from "@/components/Buttons";
import {useTranslations} from "next-intl";
import LinkLoginRequired from "@/components/Link";

export function MoviesHero({movies, onClick}: {movies: iMovie[], onClick?: () => void}) {
    const [index, setIndex] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

    const startInterval = useCallback(() => {
        if (intervalRef.current)
            clearInterval(intervalRef.current);

        intervalRef.current = setInterval(() => {
            setIndex((prev) => (prev + 1) % movies.length);
        }, 6000);
    }, [movies.length]);

    const slide = (side: number) => {
        if (side > 0)
            setIndex((prev) => (prev + 1) % movies.length);
        else
            setIndex((prev) => (prev - 1 + movies.length) % movies.length);
        startInterval();
    };

    useEffect(() => {
        if (!movies.length)
            return;
        startInterval();
        return () => clearInterval(intervalRef.current);
    }, [movies.length, startInterval]);

    return (<div className="overflow-hidden w-full">
        <div className="flex transition-transform duration-600 ease-out"
             style={{transform: `translateX(-${100 * index}%)`}}>
            {movies.length > 0 ?
                movies.map((movie, index) => (
                <MovieHero key={index} movie={movie} onClick={onClick} onSlide={slide} />)) :
                <MovieHero movie={undefined} />
            }
        </div>
    </div>);
}

export function MovieHero({movie, onClick, onSlide}: {movie?: iMovie, onClick?: () => void, onSlide?: (side: number) => void}) {
    const t = useTranslations("movie");
    const [isLoaded, setIsLoaded] = useState(false);

    return (<div className={"px-4 sm:px-6 min-w-full" + (movie === undefined ? " pb-4 sm:pb-6" : "")}>
        <div className="relative flex flex-col items-center gap-4 aspect-video xl:aspect-21/9 border">
            {movie && <Image className={`size-full object-cover ${isLoaded ? "opacity-100" : "opacity-0"}`} width={5000}
                             height={5000} loading="eager" onLoad={() => setIsLoaded(true)}
                             src={movie.backdrop_url.replace("/w500/", "/original/")} alt={t("posterAlt", {title: movie.title})}/>}
            {onSlide && <div className="h-full w-50 z-30 absolute left-0 custom-cursor-left"
                  onClick={() => onSlide(-1)}></div>}
            {onClick ?
                <div className="h-full w-full z-20 absolute custom-cursor-play" onClick={onClick}></div>
                : (movie && <LinkLoginRequired href={"/movies/" + movie.imdb_id} className="h-full w-full z-20 absolute" />)
            }
            {onSlide && <div className="h-full w-50 z-30 absolute right-0 custom-cursor-right"
                 onClick={() => onSlide(1)}></div>}
            <div className="absolute inset-0 text-white flex items-end justify-center text-center mx-auto">
                <div className="custom-noise" />
                <div className={isLoaded ? "bg-gradient" : "custom-loading"} />
                {movie && <LinkLoginRequired href={"/movies/" + movie.imdb_id} className="absolute z-40 max-w-2/3 bottom-1/20">
                    {
                        onSlide ?
                            <h1 className="relative hover:underline decoration-3 underline-offset-3">{movie.title}
                                <span className="absolute -right-8 sm:-right-13 xl:-right-18 responsive-text-hairline">{movie.year}</span>
                            </h1> :
                            <SecondaryButton className="my-2 xl:my-4 font-bold md:h-12" onClick={() => console.log("watch movie")}>{t("watch")}</SecondaryButton>
                    }
                </LinkLoginRequired>}
            </div>
        </div>
    </div>);
}
