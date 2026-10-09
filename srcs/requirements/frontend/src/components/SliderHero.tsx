import React, {useCallback, useEffect, useRef, useState} from "react";
import MediaHero from "@/components/MediaHero";
import {Link} from "@/i18n/navigation";
import {iMedia} from "@/types/media";
import formatURL from "@/utils/formatURL";
import {TitleMedia} from "@/components/Title";

export default function SliderHero({medias}: {medias: iMedia[]}) {
    const [index, setIndex] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

    const startInterval = useCallback(() => {
        if (intervalRef.current)
            clearInterval(intervalRef.current);

        intervalRef.current = setInterval(() => {
            setIndex((prev) => (prev + 1) % medias.length);
        }, 6000);
    }, [medias.length]);

    const onSlide = (side: number) => {
        if (side > 0)
            setIndex((prev) => (prev + 1) % medias.length);
        else
            setIndex((prev) => (prev - 1 + medias.length) % medias.length);
        startInterval();
    };

    useEffect(() => {
        if (!medias.length)
            return;
        startInterval();
        return () => clearInterval(intervalRef.current);
    }, [medias.length, startInterval]);

    return (<div className="overflow-hidden w-full">
        <div className="flex transition-transform duration-600 ease-out"
             style={{transform: `translateX(-${100 * index}%)`}}>
            {medias.length > 0 ?
                medias.map((media, index) => (<MediaHero key={index} media={media} actionButton={
                    () => <Link href={formatURL(media)}>
                            <TitleMedia media={media} clickable={true} white={true}/>
                        </Link>}>
                    <Link href={formatURL(media)} className="size-full z-20 absolute"/>
                    <div className="h-full w-50 z-30 absolute left-0 custom-cursor-left" onClick={() => onSlide?.(-1)}/>)
                    <div className="h-full w-50 z-30 absolute right-0 custom-cursor-right" onClick={() => onSlide?.(1)}/>)
                </MediaHero>)) :
                <MediaHero media={undefined} />
            }
        </div>
    </div>);
}
