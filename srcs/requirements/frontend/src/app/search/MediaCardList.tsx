import {Link, useRouter} from "@/i18n/navigation";
import {useTranslations} from "next-intl";
import React, {Dispatch, SetStateAction, useState} from "react";
import LoadingText from "@/components/LoadingText";
import {iGenre} from "@/types/genre";
import Button from "@/components/ui/Button/Button";
import LoadingImage from "@/components/ui/LoadingImage";
import {iUser} from "@/types/user";
import MediaWatchProgress from "@/components/MediaWatchProgress";
import GenreTags from "@/components/GenreTags";
import MediaRightClick from "@/components/MediaRightClick";
import {iAxe} from "@/types/utils";
import {iMedia} from "@/types/media";
import formatURL from "@/utils/formatURL";
import {TitleMedia} from "@/components/Title";
import Rating from "@/components/Rating";


export default function MediaCardList({media, user, setFilterGenre} : {media?: iMedia, user?: iUser, setFilterGenre: Dispatch<SetStateAction<iGenre[]>>}) {
    const router = useRouter();
    const t = useTranslations("media");
    const [contextMenu, setContextMenu] = useState<iAxe>();

    const handleContextMenu = (e: React.MouseEvent<HTMLTableRowElement>) => {
        e.preventDefault();

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
        });
    };

    return (<tr onContextMenu={handleContextMenu}>
        <td className="p-2 xl:p-4">
            {user && media && <MediaRightClick user={user} media={media} contextMenu={contextMenu} setContextMenu={setContextMenu}/>}
            <div className="border overflow-hidden aspect-3/2 relative">
                <div className="custom-noise"/>
                {!media && (<div className="custom-loading"/>)}
                {media && <Link href={formatURL(media)}>
                    <MediaWatchProgress user={user} media={media} />
                    <LoadingImage key={media.backdrop_url}
                        className="size-full object-cover"
                        width={600} height={400} src={media.backdrop_url} alt={t("posterAlt", {title: media.title})}
                        loading="eager"
                    />
                    {media.complete && <div className="custom-complete-media"/>}
                </Link>}
            </div>
        </td>
        <td className="sm:px-3">
            {media ? <Link href={formatURL(media)}>
                    <TitleMedia media={media} clickable={true} className="sm:gap-2"/>
                </Link> :
                <LoadingText/>}
        </td>
        <td/>
        <td className="hidden lg:table-cell">
            {media && <GenreTags genreIds={media.genres} limit={3} setFilterGenreAction={setFilterGenre}/>}
        </td>
        <td className="hidden sm:table-cell">
            <Rating media={media} user={user} className="font-medium"/>
        </td>
        <td className="text-right">
            <Button className="px-3" onClick={() => media && router.push(formatURL(media))}>{t("watch")}</Button>
        </td>
    </tr>);
}
