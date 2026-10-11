import React from "react";
import Title from "@/components/Title";
import {iCollectionPart, iMedia} from "@/types/media";
import {useCollection} from "@/services/medias.service";
import useAuth from "@/contexts/AuthContext";
import {iUser} from "@/types/user";
import {useMediaRightClick} from "@/components/MediaRightClick";
import formatURL from "@/utils/formatURL";
import MediaRow from "@/app/[type]/[id]/MediaRow";

export default function MovieCollectionSection({media}: {media: iMedia}) {
    const {data: collection} = useCollection(media);
    const {user} = useAuth();

    if (!collection || !collection.name || collection.parts.length < 2)
        return null;

    return (<div className="mx-auto max-w-2xl w-9/10">
        <Title title={collection.name} tag="h2" exp={collection.parts.length}/>
        <table className="w-full table-fixed mt-2">
            <tbody>
                {collection.parts.map((part, index) => <Part key={part.id} part={part} number={index + 1} user={user} isSelected={String(part.id) === String(media.id)}/>)}
            </tbody>
        </table>
    </div>);
}

function Part({part, number, user, isSelected}: {part: iCollectionPart, number: number, user?: iUser, isSelected: boolean}) {
    const {onContextMenu, menu} = useMediaRightClick(part);

    return (<MediaRow number={number} title={part.title} subtitle={part.year} overview={part.summary} image={part.backdrop_url || part.poster_url} alt={part.title}
                      progress={part} user={user} isSelected={isSelected} href={isSelected ? undefined : formatURL(part)}
                      menu={menu} onContextMenu={onContextMenu}/>);
}
