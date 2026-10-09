import React from "react";
import Title from "@/components/Title";
import {iCollectionPart, iMedia} from "@/types/media";
import {useCollection} from "@/services/medias.service";
import LoadingImage from "@/components/ui/LoadingImage";
import SmallText from "@/components/ui/SmallText";
import useAuth from "@/contexts/AuthContext";
import MediaWatchProgress from "@/components/MediaWatchProgress";
import {iUser} from "@/types/user";
import ExpandableText from "@/components/ui/ExpandableText";
import {Link} from "@/i18n/navigation";
import formatURL from "@/utils/formatURL";

export default function MovieCollectionSection({media}: {media: iMedia}) {
    const {data: collection} = useCollection(media);
    const {user} = useAuth();

    if (!collection || !collection.name || collection.parts.length < 2)
        return null;

    return (<div className="mx-auto max-w-2xl w-9/10">
        <Title title={collection.name} tag="h2" exp={collection.parts.length}/>
        <table className="mt-2">
            <tbody>
                {collection.parts.map((part, index) => <Part key={part.id} part={part} number={index + 1} user={user} isSelected={String(part.id) === String(media.id)}/>)}
            </tbody>
        </table>
    </div>);
}

function Part({part, number, user, isSelected}: {part: iCollectionPart, number: number, user?: iUser, isSelected: boolean}) {
    const image = part.backdrop_url || part.poster_url;
    const poster = (<div className="relative border aspect-10/7 overflow-hidden max-h-32">
        {image && <LoadingImage className="size-full object-cover" width={200} height={200} src={image} alt={part.title}/>}
        <MediaWatchProgress user={user} media={part}/>
        <div className="custom-noise opacity-30"/>
        {part.complete && <div className="custom-complete-media"/>}
    </div>);

    return (<tr>
        <td className={"font-bold text-2xl font-wide text-right pr-1 pl-4" + (isSelected ? " border-l-5" : "")}>
            <span>{number}</span>
        </td>
        <td className="px-4 w-50 py-2">
            {isSelected ? poster : <Link href={formatURL(part)}>{poster}</Link>}
        </td>
        <td className="align-top py-2">
            {isSelected ?
                <span className="font-semibold text-lg uppercase">{part.title}</span> :
                <Link href={formatURL(part)} className="font-semibold text-lg uppercase hover:underline">{part.title}</Link>}
            <SmallText className="text-left">{part.year}</SmallText>
            <ExpandableText className="text-sm text-gray leading-tight" lines={2} showBtn={false}>{part.summary}</ExpandableText>
        </td>
    </tr>);
}
