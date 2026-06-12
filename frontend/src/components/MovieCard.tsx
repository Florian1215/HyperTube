import Image from "next/image";
import {iMovie} from "@/types/movie";
import {iGenre} from "@/types/genre";
import React, {Dispatch, SetStateAction, useState} from "react";
import {Button} from "@/components/Buttons";
import {StarIcon} from "@/components/Icons";
import GenreTags from "@/components/GenreTags";
import {useRouter} from "@/i18n/navigation";
import {useAuth} from "@/context/AuthContext";
import {iUser} from "@/types/user";
import {useTranslations} from "next-intl";
import LinkLoginRequired from "@/components/Link";


export function MoviesCard({movieSets, className} : {movieSets?: iMovie[], className?: string}) {
    const {user} = useAuth();

    return (<div className={"grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-4 " + className}>
        {
            movieSets ?
                movieSets.map((movie) => (<MovieCard key={movie.imdb_id} movie={movie} user={user} />)) :
                [...Array(3)].map((_, i) => (<MovieCard key={i} movie={null} user={user} />))
        }
    </div>);
}

export function MovieCard({movie, user, className, showTitle = true} : {movie: iMovie | null, user: iUser | null, className?: string, showTitle?: boolean}) {
    let watchingPercent = 0;
    const t = useTranslations("movie");
    if (user && movie) {
        const watchMovie = user.watch_history.find(h => h.movie_id === movie.imdb_id);
        if (watchMovie)
            watchingPercent = watchMovie.watch_percent;
    }
    const containerClass = "relative aspect-10/7 overflow-hidden border";
    const [isLoaded, setIsLoaded] = useState(false);

    if (!movie) {
        return (<div className={containerClass}>
            <div className="custom-loading"/>
        </div>);
    }
    return (<LinkLoginRequired href={"/movies/" + movie.imdb_id} className={containerClass + " " + className}>
        {!isLoaded && (<div className="custom-loading absolute inset-0" />)}
        <Image className={`size-full object-cover transition-transform duration-200 group-hover:scale-103 ${isLoaded ? "opacity-100" : "opacity-0"}`}
               width={1000} height={1000} src={movie.backdrop_url.replace("/w500/", "/w1280/")} alt={t("posterAlt", {title: movie.title})} loading="eager"
               onLoad={() => setIsLoaded(true)}
        />
        {watchingPercent > 0 && <div className={`absolute bottom-0 h-1 bg-${user ? user.color : "red"} z-10`} style={{width: `${watchingPercent}%`}}></div>}
        <div className="absolute inset-0 p-4 flex items-end">
            <div className="custom-noise" />
            {
                watchingPercent === 100 ?
                <div className="size-full absolute inset-0 bg-black/60"></div> :
                <div className="bg-gradient" />
            }
            {
                showTitle &&
                <h3 className="relative text-white hover:underline decoration-2 underline-offset-3 z-10 mx-auto">{movie.title}
                    <span className="absolute -right-11 font-hairline text-lg tracking-normal">{movie.year}</span>
                </h3>
            }
        </div>
    </LinkLoginRequired>);
}

export function ListMovieCard({movie, setFilterGenre} : {movie: iMovie | null, setFilterGenre: Dispatch<SetStateAction<iGenre[]>>}) {
    const router = useRouter();
    const t = useTranslations("movie");
    let title = movie?.title;
    const [isLoaded, setIsLoaded] = useState(false);
    const maxWidths = ["max-w-40", "max-w-70", "max-w-100", "max-w-130", "max-w-150"]
    const [randomWidth] = useState(() => maxWidths[Math.floor(Math.random() * maxWidths.length)]);

    if (title && title.length > 20)
        title = title.slice(0, 18) + "...";

    return (<tr className="border-b group">
            <td className="p-2 xl:p-4">
                <div className="border overflow-hidden aspect-3/2 relative">
                    <div className="custom-noise" />
                    {!isLoaded && (<div className="custom-loading" />)}
                    {movie && <LinkLoginRequired href={"/movies/" + movie.imdb_id}>
                        <Image
                            className={`size-full object-cover transition-transform duration-200 group-hover:scale-103 ${isLoaded ? "opacity-100" : "opacity-0"}`}
                            width={600} height={400} src={movie.backdrop_url} alt={t("posterAlt", {title: movie.title})}
                            loading="eager"
                            onLoad={() => setIsLoaded(true)}
                        />
                    </LinkLoginRequired>}
                </div>
            </td>
            <td className="sm:pl-3">
                {movie ? <LinkLoginRequired href={"/movies/" + movie.imdb_id} className="flex gap-1 sm:gap-2">
                    <h1 className="hover:underline decoration-2 underline-offset-3 text-nowrap">{title}</h1>
                    <span className="responsive-text-hairline">{movie.year}</span>
                </LinkLoginRequired> :
                    <div className="h-17">
                        <div className={"custom-loading " + randomWidth} />
                    </div>
                }
            </td>
            <td></td>
            <td className="hidden lg:table-cell">
                {movie && <GenreTags genreIds={movie.genres} limit={3} setFilterGenre={setFilterGenre}/>}
            </td>
            <td className="hidden sm:table-cell">
                <div className="flex gap-1 items-center">
                    <StarIcon />
                    {movie ? <span>{movie.note.toFixed(1)}</span> :
                        <div className="h-5.5 w-5">
                            <div className="custom-loading"/>
                        </div>
                    }
                </div>
            </td>
            <td className="text-right">
                <Button className="px-3" onClick={() => movie && router.push("/movies/" + movie.imdb_id)}>{t("watch")}</Button>
            </td>
    </tr>);
}
