import {useTranslations} from "next-intl";
import React, {useState} from "react";
import {iMovie} from "@/types/movie";
import Image from "next/image";
import LinkLoginRequired from "@/components/ui/LinkLoginRequired";
import SecondaryButton from "@/components/ui/Button/SecondaryButton";
import useAuth from "@/contexts/AuthContext";
import VideoPlayer from "@/components/ui/VideoPlayer";
import {API_URL} from "@/services/apiClient";

export default function MovieHero({movie, onClick, onSlide, torrentId}: {movie?: iMovie, onClick?: () => void, onSlide?: (side: number) => void, torrentId?: string}) {
    const t = useTranslations("movie");
    const [isLoaded, setIsLoaded] = useState(false);
    const {user} = useAuth();

    return (<div className="px-4 sm:px-6 min-w-full">
        <div className="relative flex flex-col items-center gap-4 aspect-video xl:aspect-21/9 border">
            {torrentId &&
                <VideoPlayer color={user?.color ?? "purple"} src={`${API_URL}/stream/${torrentId}/index`} />}
            {!torrentId && movie && <Image className={`size-full object-cover ${isLoaded ? "opacity-100" : "opacity-0"}`} width={5000}
                             height={5000} loading="eager" onLoad={() => setIsLoaded(true)}
                             src={movie.backdrop_url.replace("/w500/", "/original/")} alt={t("posterAlt", {title: movie.title})}/>}
            {!torrentId && onSlide && <div className="h-full w-50 z-30 absolute left-0 custom-cursor-left"
                  onClick={() => onSlide(-1)} />}
            {!torrentId && (onClick ?
                <div className="size-full z-20 absolute custom-cursor-play" onClick={onClick} />
                : (movie && <LinkLoginRequired href={"/movies/" + movie.imdb_id} className="h-full w-full z-20 absolute" />))
            }
            {!torrentId && onSlide && <div className="h-full w-50 z-30 absolute right-0 custom-cursor-right"
                 onClick={() => onSlide(1)} />}
            <div className="absolute inset-0 text-white flex items-end justify-center text-center mx-auto">
                <div className="custom-noise" />
                <div className={isLoaded ? "bg-gradient" : "custom-loading"} />
                {torrentId && <div className="custom-loading2 opacity-80"/>}
                {!torrentId && movie && <LinkLoginRequired href={"/movies/" + movie.imdb_id} className="absolute z-40 max-w-2/3 bottom-1/20">
                    {
                        onClick && !onSlide ?
                            <SecondaryButton className="my-2 xl:my-4 font-bold md:h-12" onClick={onClick}>{t("watch")}</SecondaryButton> :
                            <h1 className="relative hover:underline decoration-3 underline-offset-3">{movie.title}
                                <span className="absolute -right-8 sm:-right-13 xl:-right-18 responsive-text-hairline">{movie.year}</span>
                            </h1>
                    }
                </LinkLoginRequired>}
            </div>
        </div>
    </div>);
}
