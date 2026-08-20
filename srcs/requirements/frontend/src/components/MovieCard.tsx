import {useLocale, useTranslations} from "next-intl";
import {iMovie} from "@/types/movie";
import {iUser} from "@/types/user";
import React, {useState} from "react";
import Image from "next/image";
import MovieWatchProgress from "@/components/MovieWatchProgress";
import {Link} from "@/i18n/navigation";
import {EyeIcon} from "@/components/Icons";
import MovieRightClick from "@/components/MovieRightClick";
import {iAxe} from "@/types/utils";

export default function MovieCard({movie, user, className, showTitle=true, showDate=false} : {movie?: iMovie, user?: iUser, className?: string, showTitle?: boolean, showDate?: boolean}) {
    const t = useTranslations("movie");
    const containerClass = "relative aspect-10/7 overflow-hidden border";
    const [isLoaded, setIsLoaded] = useState(false);
    const [contextMenu, setContextMenu] = useState<iAxe>();
    const locale = useLocale();

    const handleContextMenu = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
        });
    };

    if (!movie) {
        return (<div className={containerClass}>
            <div className="custom-loading"/>
        </div>);
    }

    return (<Link href={"/movies/" + movie.id} className={containerClass + " group " + className} onContextMenu={handleContextMenu}>
        {user && movie && movie.progress > 0 && !movie.complete && <MovieRightClick user={user} movie={movie} contextMenu={contextMenu} setContextMenu={setContextMenu}/>}
        <Image className={`size-full object-cover transition-transform duration-200 ${isLoaded ? "opacity-100" : "opacity-0"}`}
               width={1000} height={1000} src={movie.backdrop_url.replace("/w500/", "/w1280/")} alt={t("posterAlt", {title: movie.title})} loading="eager"
               onLoad={() => setIsLoaded(true)}
        />
        <MovieWatchProgress user={user} movie={movie} />
        {!isLoaded && <div className="absolute inset-0 size-full"><div className="custom-loading"/></div>}
        <div className="absolute inset-0 p-4 flex items-end">
            <div className="custom-noise" />
            <div className={movie.complete ? "custom-complete-movie" : "bg-gradient"} />
            {showTitle &&
                <h3 className="pl-[8%] flex gap-1 justify-center w-full z-10 text-white">
                    <span className="max-w-8/10 custom-movie-title">{movie.title}</span>
                    <span className="responsive-text-hairline xl:text-xl text-xl">{movie.year}</span>
                </h3>}
        </div>
        {showDate && movie.watched_at && <div className="hidden group-hover:flex absolute items-center top-1 right-2 z-10 gap-2">
            <EyeIcon size={20} color="white"/>
            <p
            className="text-white text-sm font-bold">{new Date(movie.watched_at).toLocaleDateString(locale, {
            day: "numeric",
            month: "long",
            year: "numeric",
        })}</p></div>}
    </Link>);
}
