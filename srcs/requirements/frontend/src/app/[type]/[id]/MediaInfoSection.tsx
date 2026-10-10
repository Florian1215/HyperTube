import {iMovieDetails} from "@/types/movie";
import {iPeople} from "@/types/media";
import React from "react";
import {useTranslations} from "next-intl";
import LoadingText from "@/components/LoadingText";
import GenreTags from "@/components/GenreTags";
import Label from "@/components/ui/Label";
import {Link} from "@/i18n/navigation";
import useModal from "@/contexts/ModalContext";
import {iSerieDetails} from "@/types/serie";
import {TitleMedia} from "@/components/Title";
import useFormatDate from "@/utils/formatDate";
import ExpandableText from "@/components/ui/ExpandableText";
import TextButton from "@/components/ui/Button/TextButton";
import ProfilePicture from "@/components/ProfilePicture";
import useAuth from "@/contexts/AuthContext";
import Rating from "@/components/Rating";

const MAX_WATCHED_BY = 10;

export default function MediaInfoSection({media} : {media?: iMovieDetails | iSerieDetails}) {
    const t = useTranslations("media");
    const tSerie = useTranslations("serie");
    const {openModal} = useModal();
    const formattedReleaseDate = useFormatDate(media?.release_date);
    const {user} = useAuth();
    const tCommon = useTranslations("common");

    const getLenght = () => {
        if (media && "runtime" in media) {
            const hours = Math.floor(media.runtime / 60);
            const minutes = media.runtime % 60;
            return (`${hours}h${minutes > 10 ? "" : "0"}${minutes}`);
        }
        return "0h";
    }

    if (!media)
        return (<LoadingText center={true} />);

    const directors = media.crew.filter(p => p.job === "Director");
    const creators = media.crew.filter(p => p.job === "Creator");
    const today = new Date();
    const releaseDate = new Date(media.release_date);
    const tStatus = media.type === "series" ? tSerie : t;
    const statusKey = `statuses.${media.status}`;
    const openCredits = (tab: "info" | "cast" | "crew") => openModal({type: "credits", cast: media.cast, crew: media.crew, media: media, tab});
    const openWatchedBy = () => openModal({type: "watched-by", media: media});
    const status = media.status === "Released" ? undefined : (tStatus.has(statusKey) ? tStatus(statusKey) : media.status);

    return (<div className="flex flex-col gap-2 xl:gap-4 max-w-full md:max-w-5/6 xl:max-w-2/3 mx-3 sm:mx-auto">
        <TitleMedia media={media}/>
        {
            releaseDate > today &&
            <InfoMedia name={t("release")}>
                <p>{formattedReleaseDate}</p>
            </InfoMedia>
        }
        {media.rating > 0 && <InfoMedia name={t("rating")}>
            <Rating media={media} user={user} after={true}/>
        </InfoMedia>}
        {
            media.watched_by.length > 0 &&
            <InfoMedia name={t("watchedBy")} onClick={openWatchedBy}>
                <div className="flex flex-wrap items-center gap-1.5">
                    {media.watched_by.slice(0, MAX_WATCHED_BY).map((user) => (<Link key={user.id} href={`/users/${user.id}`} title={user.username} className="flex isolate">
                        {Array.from({length: Math.min(Math.max(user.watch_count, 1), 15)}, (_, i) => (<div key={i} className={i > 0 ? "-ml-6.5" : ""} style={{zIndex: 5 - i}}>
                            <ProfilePicture size={3} user={user}/>
                        </div>))}
                    </Link>))}
                </div>
            </InfoMedia>
        }
        {status && <InfoMedia name={t("status")}><p>{status}</p></InfoMedia>}
        {
            "runtime" in media && media.runtime > 0 &&
            <InfoMedia name={t("length")}>
                <p>{getLenght()}</p>
            </InfoMedia>
        }
        {
            media.genres.length > 0 &&
            <InfoMedia name={t("genre")}>
                <GenreTags genreIds={media.genres}/>
            </InfoMedia>
        }
        <InfoPeopleMedia name={t("directors")} items={directors} onClick={() => openCredits("crew")}/>
        <InfoPeopleMedia name={t("creators")} items={creators} onClick={() => openCredits("crew")}/>
        <InfoPeopleMedia name={t("stars")} items={media.cast.slice(0, 5)} onClick={() => openCredits("cast")}/>
        {
            media.summary.length > 0 &&
            <InfoMedia name={t("synopsis")} center={false} onClick={() => openCredits("info")}>
                <ExpandableText showBtn={false}>{media.summary}</ExpandableText>
            </InfoMedia>
        }
    </div>);
}


function InfoMedia({children, name, center=true, onClick}: {children: React.ReactNode, name: string, center?: boolean, onClick?: () => void}) {
    return (<div className={"flex gap-4 " + (center ? "items-center" : "items-start")}>
        <div className="flex justify-end w-1/4 md:w-1/3 xl:w-1/2">
            {onClick ? <button className="custom-underline text-right" onClick={onClick}><Label>{name}</Label></button> : <Label>{name}</Label>}
        </div>
        <div className="w-3/4 md:w-2/3 xl:w-1/2">
            {children}
        </div>
    </div>);
}

function InfoPeopleMedia({name, items, onClick}: {name: string, items: iPeople[], onClick: () => void}) {
    if (!items.length)
        return null;
    return (<InfoMedia name={name} center={false} onClick={onClick}>
        <p className="inline">
            {items.map((i, index) => (<span key={index}>
                <Link className="custom-underline" href={`/people/${i.id}`}>{i.name}</Link>
                {index < items.length - 1 && " , "}
            </span>))}
        </p>
    </InfoMedia>);
}
