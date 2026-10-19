import React from "react";
import LoadingImage from "@/components/ui/LoadingImage";
import HoverEffect from "@/components/ui/HoverEffect";
import SmallText from "@/components/ui/SmallText";
import MediaWatchProgress from "@/components/MediaWatchProgress";
import ExpandableText from "@/components/ui/ExpandableText";
import {Link} from "@/i18n/navigation";
import {iMedia} from "@/types/media";
import {iUser} from "@/types/user";

type tMediaRow = {
    number: number
    title: string
    subtitle: React.ReactNode
    overview: string
    image?: string
    alt: string
    progress: Pick<iMedia, "pourcent" | "complete">
    user?: iUser
    isSelected: boolean
    href?: string
    onClick?: () => void
    menu?: React.ReactNode
    onContextMenu?: (e: React.MouseEvent<HTMLDivElement>) => void
}

export default function MediaRow({number, title, subtitle, overview, image, alt, progress, user, isSelected, href, onClick, menu, onContextMenu}: tMediaRow) {
    const clickable = href !== undefined || onClick !== undefined;
    const titleClassName = `block max-w-full font-semibold text-sm sm:text-lg uppercase truncate text-left ${clickable ? "hover:text-accent" : ""}`;
    const withLink = (children: React.ReactNode) => href !== undefined ? <Link href={href}>{children}</Link> : children;

    return (<tr>
        <td onClick={onClick} className={`font-bold text-xl sm:text-2xl font-wide text-right pr-1 pl-0 sm:pl-4 w-9 sm:w-14 ${clickable ? "hover:cursor-pointer hover:text-accent" : ""} ${isSelected ? "border-l-5 border-accent hover:cursor-default" : ""}`}>
            {withLink(<span>{number}</span>)}
        </td>
        <td className="px-2 sm:px-4 w-36 sm:w-50 py-2 align-top" onClick={onClick}>
            {menu}
            {withLink(<div className="relative aspect-10/7" onContextMenu={onContextMenu}>
                <HoverEffect className="absolute inset-0" innerClassName="border overflow-hidden" scale={1.05}>
                    {image && <LoadingImage className="size-full object-cover" width={200} height={200} src={image} alt={alt}/>}
                    <MediaWatchProgress user={user} media={progress}/>
                    <div className="custom-noise opacity-30"/>
                    {progress.complete && <div className="custom-complete-media"/>}
                </HoverEffect>
            </div>)}
        </td>
        <td className="align-top pt-5 pb-2">
            {href !== undefined ?
                <Link href={href} title={title} className={titleClassName}>{title}</Link> :
                onClick ?
                <button onClick={onClick} title={title} className={titleClassName}>{title}</button> :
                <span title={title} className={titleClassName}>{title}</span>}
            <SmallText className="text-left">{subtitle}</SmallText>
            <ExpandableText className="text-xs sm:text-sm text-gray leading-tight" lines={2} showBtn={false}>{overview}</ExpandableText>
        </td>
    </tr>);
}
