import {iMovieDetails, iPeople} from "@/types/movie";
import React from "react";
import {useLocale, useTranslations} from "next-intl";
import LoadingText from "@/components/LoadingText";
import GenreTags from "@/components/GenreTags";
import Label from "@/components/ui/Label";
import {Link} from "@/i18n/navigation";
import useModal from "@/contexts/ModalContext";

export default function MovieInfoSection({movie} : {movie?: iMovieDetails}) {
    const t = useTranslations("movie");
    const {openModal} = useModal();
    const locale = useLocale();

    const getLenght = () => {
        if (!movie)
            return "0h";

        const hours = Math.floor(movie.runtime / 60);
        const minutes = movie.runtime % 60;
        return (`${hours}h${minutes > 10 ? "" : "0"}${minutes}`);
    }

    if (!movie)
        return (<LoadingText center={true} />);

    const directors = movie.crew.filter(p => p.job === "Director");
    const today = new Date();
    const releaseDate = new Date(movie.release_date);

    return (<div className="flex flex-col gap-2 xl:gap-4 max-w-full md:max-w-5/6 xl:max-w-2/3 mx-3 sm:mx-auto">
        <h1 className="flex gap-1 justify-center w-full">
            <span className="max-w-8/10 custom-movie-title">{movie.title}</span>
            <span className="responsive-text-hairline">{movie.year}</span>
        </h1>

        {
            releaseDate > today &&
            <InfoMovie name={t("release")}>
                <p>{releaseDate.toLocaleDateString(locale, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                })}</p>
            </InfoMovie>
        }

        {
            movie.status !== "Released" &&
            <InfoMovie name={t("status")}>
                <p>{movie.status}</p>
            </InfoMovie>
        }

        {
            movie.runtime > 0 &&
            <InfoMovie name={t("length")}>
                <p>{getLenght()}</p>
            </InfoMovie>
        }

        {
            movie.genres.length > 0 &&
            <InfoMovie name={t("genre")}>
                <GenreTags genreIds={movie.genres}/>
            </InfoMovie>
        }

        <InfoPeoplesMovie name={t("directors")} items={directors}/>
        <InfoPeoplesMovie name={t("stars")} items={movie.cast.slice(0, 5)} openModal={() => openModal({type: "credits", cast: movie.cast, crew: movie.crew})}/>

        {
            movie.summary.length > 0 &&
            <InfoMovie name={t("synopsis")}>
                <p>{movie.summary}</p>
            </InfoMovie>
        }
    </div>);
}


function InfoMovie({children, name}: {children: React.ReactNode, name: string}) {
    return (<div className="flex gap-4">
        <div className="flex justify-end w-1/4 md:w-1/3 xl:w-1/2">
            <Label>{name}</Label>
        </div>
        <div className="w-3/4 md:w-2/3 xl:w-1/2">
            {children}
        </div>
    </div>);
}

function InfoPeoplesMovie({name, items, openModal}: {name: string, items: iPeople[], openModal?: () => void}) {
    if (!items.length)
        return null;
    return (<InfoMovie name={name}>
        <p className="inline">
            {items.map((i, index) => (<span key={index}>
                <Link className="custom-underline" href={`/people/${i.id}`}>{i.name}</Link>
                {(index < items.length - 1 || openModal) && " , "}
            </span>))}
            {openModal && <button className="custom-underline" onClick={openModal}>...</button>}
        </p>
    </InfoMovie>);
}
