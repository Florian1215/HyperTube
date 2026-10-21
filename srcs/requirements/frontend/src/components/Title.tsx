"use client";

import React, {useEffect, useRef, useState} from "react";
import {iMedia} from "@/types/media";

type tTitle = {
    tag?: "h1" | "h2" | "h3"
    clickable?: boolean
    className?: string
    expClassName?: string
    white?: boolean
    tightTruncate?: boolean
};

export default function Title({title, exp, parenthesis=true, tag: Tag="h1", clickable=false, className="justify-center", expClassName="", white=false, tightTruncate=false}: {title: string, exp: string | number, parenthesis?: boolean} & tTitle) {
    const titleRef = useRef<HTMLSpanElement>(null);
    const [expShift, setExpShift] = useState(0);
    exp = parenthesis ? `(${exp})` : exp;

    useEffect(() => {
        const span = titleRef.current;
        if (!tightTruncate || !span)
            return;
        const update = () => setExpShift(span.scrollWidth > span.clientWidth ? parseFloat(getComputedStyle(span).fontSize) * 0.3 : 0);
        const observer = new ResizeObserver(update);
        observer.observe(span);
        return () => observer.disconnect();
    }, [tightTruncate, title]);

    return (<Tag className={`flex gap-1 w-full hover:cursor-default ${white ? " text-white" : "text-dblack"} ${className}`}>
        <span ref={titleRef} className={`min-w-0 truncate ${clickable && !white ? "hover:text-accent" : ""}`}>{title}</span>
        <span style={expShift ? {transform: `translateX(-${expShift}px)`} : undefined} className={`shrink-0 responsive-text-hairline ${expClassName}`}>{exp}</span>
    </Tag>)
}

export function TitleMedia({media, ...props}: {media: Pick<iMedia, "title" | "year">} & tTitle) {
    return (<Title title={media.title} exp={media.year} parenthesis={false} {...props}/>)
}
