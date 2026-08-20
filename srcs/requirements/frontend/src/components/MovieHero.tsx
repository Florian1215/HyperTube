import { useTranslations } from "next-intl";
import React, {useState} from "react";
import {iMovie, iMovieDetails} from "@/types/movie";
import Image from "next/image";
import {Link} from "@/i18n/navigation";

export default function MovieHero({children, movie, childrenAction, actionButton}: {children?: React.ReactNode, movie?: iMovie | iMovieDetails, childrenAction?: () => React.ReactNode, actionButton?: () => React.ReactNode}) {
    const t = useTranslations("movie");
    const [isLoaded, setIsLoaded] = useState(false);

    return (<div className="px-4 sm:px-6 min-w-full">
        <div className="relative flex flex-col items-center gap-4 aspect-video xl:aspect-21/9 border">
            {movie && (<Image className={"absolute inset-0 size-full object-cover " + (isLoaded ? "opacity-100" : "opacity-0")}
                    width={5000} height={5000} loading="eager"
                    onLoad={() => setIsLoaded(true)}
                    src={movie.backdrop_url} alt={t("posterAlt", { title: movie.title })}/>)}
            {childrenAction && childrenAction()}
            <div className="absolute inset-0 text-white flex items-end justify-center text-center mx-auto">
                <div className="custom-noise" />
                <div className={isLoaded ? "bg-gradient" : "custom-loading"} />
                {children}
                {movie &&
                    <Link href={`/movies/${movie.id}`} className="absolute z-40 max-w-2/3 bottom-1/20">
                        {
                            actionButton ?
                                actionButton() :
                                <h1 className="relative hover:underline decoration-3 underline-offset-3">
                                    {movie.title}
                                    <span className="absolute -right-8 sm:-right-13 xl:-right-18 responsive-text-hairline">{movie.year}</span>
                                </h1>
                        }
                    </Link>
                }
            </div>
        </div>
    </div>);
}
