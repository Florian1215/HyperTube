import { useTranslations } from "next-intl";
import React, {useState} from "react";
import {iMovie, iMovieDetails} from "@/types/movie";
import Image from "next/image";

export default function MovieHero({children, movie, childrenAction, actionButton}: {children?: React.ReactNode, movie?: iMovie | iMovieDetails, childrenAction?: () => React.ReactNode, actionButton?: () => React.ReactNode}) {
    const t = useTranslations("movie");
    const [isLoaded, setIsLoaded] = useState(false);

    return (<div className="px-4 sm:px-6 min-w-full">
        <div className="relative flex flex-col items-center gap-4 aspect-video xl:aspect-21/9 border">
            {movie && (<Image className={"absolute inset-0 size-full object-cover " + (isLoaded ? "opacity-100" : "opacity-0")}
                    width={5000} height={5000} loading="eager"
                    onLoad={() => setIsLoaded(true)}
                    src={movie.backdrop_url} alt={t("posterAlt", {title: movie.title})}/>)}
            {childrenAction && childrenAction()}
            <div className="absolute inset-0 text-white flex items-end justify-center text-center mx-auto">
                <div className="custom-noise" />
                <div className={isLoaded ? "bg-gradient" : "custom-loading"} />
                {movie && actionButton && <div className="absolute max-w-2/3 bottom-1/20">{actionButton()}</div>}
                {children}
            </div>
        </div>
    </div>);
}
