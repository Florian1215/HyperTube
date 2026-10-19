import { useTranslations } from "next-intl";
import React from "react";
import LoadingImage from "@/components/ui/LoadingImage";
import {iMedia} from "@/types/media";
import HoverEffect from "@/components/ui/HoverEffect";

export default function MediaHero({children, media, childrenAction, actionButton, onHoverChange}: {children?: React.ReactNode, media?: Pick<iMedia, "title" | "backdrop_url">, childrenAction?: () => React.ReactNode, actionButton?: () => React.ReactNode, onHoverChange?: (hover: boolean) => void}) {
    const t = useTranslations("media");

    return (<div className="px-4 sm:px-6 min-w-full">
        <HoverEffect className="relative aspect-video xl:aspect-21/9" innerClassName="flex flex-col items-center gap-4 border" disabled={!onHoverChange || !media} scale={1.01} onHoverChange={onHoverChange}>
            {media ?
                <LoadingImage key={media.backdrop_url} className="absolute inset-0 size-full object-cover"
                    width={5000} height={5000} loading="eager"
                    src={media.backdrop_url} alt={t("posterAlt", {title: media.title})}/> :
                <div className="absolute inset-0 size-full"><div className="custom-loading"/></div>}
            {childrenAction && childrenAction()}
            <div className="absolute inset-0 text-white flex items-end justify-center text-center mx-auto">
                <div className="custom-noise"/>
                <div className="bg-gradient"/>
                {media && actionButton && <div className="absolute max-w-2/3 bottom-1/20">{actionButton()}</div>}
                {children}
            </div>
        </HoverEffect>
    </div>);
}
