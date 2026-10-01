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
import {StarIcon} from "@/components/Icons";

export default function MediaInfoSection({media} : {media?: iMovieDetails | iSerieDetails}) {
    const t = useTranslations("media");
    const tSerie = useTranslations("serie");
    const {openModal} = useModal();
    const formattedReleaseDate = useFormatDate(media?.release_date);

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
    const status = media.status === "Released" ? undefined : (tStatus.has(statusKey) ? tStatus(statusKey) : media.status);

    return (<div className="flex flex-col gap-2 xl:gap-4 max-w-full md:max-w-5/6 xl:max-w-2/3 mx-3 sm:mx-auto">
        <TitleMedia media={media}/>
        {
            releaseDate > today &&
            <InfoMedia name={t("release")}>
                <p>{formattedReleaseDate}</p>
            </InfoMedia>
        }
        <InfoMedia name={t("rating")}><div className="flex gap-2"><p>{media.rating.toFixed(1)}</p><StarIcon/></div></InfoMedia>
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
        <InfoPeopleMedia name={t("directors")} items={directors}/>
        <InfoPeopleMedia name={t("creators")} items={creators}/>
        <InfoPeopleMedia name={t("stars")} items={media.cast.slice(0, 5)}/>
        {
            media.summary.length > 0 &&
            <InfoMedia name={t("synopsis")}>
                <ExpandableText showBtn={false}>{media.summary}</ExpandableText>
            </InfoMedia>
        }
        <InfoMedia name="">
            <TextButton onClick={() => openModal({type: "credits", cast: media.cast, crew: media.crew, media: media})}>{t("moreInfo")}</TextButton>
        </InfoMedia>
    </div>);
}


function InfoMedia({children, name}: {children: React.ReactNode, name: string}) {
    return (<div className="flex gap-4">
        <div className="flex justify-end w-1/4 md:w-1/3 xl:w-1/2">
            <Label>{name}</Label>
        </div>
        <div className="w-3/4 md:w-2/3 xl:w-1/2">
            {children}
        </div>
    </div>);
}

function InfoPeopleMedia({name, items}: {name: string, items: iPeople[]}) {
    if (!items.length)
        return null;
    return (<InfoMedia name={name}>
        <p className="inline">
            {items.map((i, index) => (<span key={index}>
                <Link className="custom-underline" href={`/people/${i.id}`}>{i.name}</Link>
                {index < items.length - 1 && " , "}
            </span>))}
        </p>
    </InfoMedia>);
}
