import {useTranslations} from "next-intl";
import React, {useState} from "react";
import {iMovie} from "@/types/movie";
import Image from "next/image";
import LinkLoginRequired from "@/components/ui/LinkLoginRequired";
import SecondaryButton from "@/components/ui/Button/SecondaryButton";
import VideoPlayer from "@/components/ui/VideoPlayer";

export default function MovieHero({movie, onClick, onSlide, torrentId}: {movie?: iMovie, onClick?: () => void, onSlide?: (side: number) => void, torrentId?: string}) {
    const t = useTranslations("movie");
    const [isLoaded, setIsLoaded] = useState(false);

    return (<div className="px-4 sm:px-6 min-w-full">
        <div className="relative flex flex-col items-center gap-4 aspect-video xl:aspect-21/9 border">
            {torrentId &&
                <VideoPlayer color={"purple"} src={"https://usher.ttvnw.net/vod/v2/2799516991.m3u8?acmb=eyJBcHBWZXJzaW9uIjoiNGY5NTMxNzgtYTUxZS00MzQ1LWE0NTktNTEwZDc4ZGQ5MzlmIiwiQ2xpZW50QXBwIjoidHdpbGlnaHQiLCJVUkwiOiJodHRwczovL3d3dy50d2l0Y2gudHYvdmlkZW9zLzI3OTk1MTY5OTEifQ==&allow_source=true&browser_family=firefox&browser_version=151.0&cdm=wv&device_manufacturer=Apple&device_model=Macintosh&enable_score=true&include_unavailable=true&lang=en&os_name=macOS&os_version=10.15&p=4758105&platform=web&play_session_id=77d28d6680594982a69d794d1344cc95&player_backend=mediaplayer&player_version=1.54.0-rc.1&playlist_include_framerate=true&reassignments_supported=true&sig=e325eb88ea04fa22d78dc94dc62b86d3c844aee1&supported_codecs=av1,h265,h264&token={\"authorization\":{\"forbidden\":false,\"reason\":\"\"},\"chansub\":{\"restricted_bitrates\":[]},\"device_id\":\"4927030e40a54064a8433517723d3a81\",\"expires\":1781870276,\"https_required\":true,\"privileged\":false,\"user_id\":null,\"version\":3,\"vod_id\":2799516991,\"maximum_resolution\":\"FULL_HD\",\"maximum_video_bitrate_kbps\":12500,\"maximum_resolution_reasons\":{\"QUAD_HD\":[\"AUTHZ_NOT_LOGGED_IN\"],\"ULTRA_HD\":[\"AUTHZ_NOT_LOGGED_IN\"]},\"maximum_video_bitrate_kbps_reasons\":[\"AUTHZ_DISALLOWED_BITRATE\"]}&transcode_mode=cbr_v1"} />}
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
