import React from "react";
import {iMedia} from "@/types/media";

type tTitle = {
    tag?: "h1" | "h2" | "h3"
    clickable?: boolean
    className?: string
    expClassName?: string
};

export default function Title({title, exp, parenthesis=true, tag: Tag="h1", clickable=false, className="justify-center", expClassName=""}: {title: string, exp: string | number, parenthesis?: boolean} & tTitle) {
    exp = parenthesis ? `(${exp})` : exp;
    return (<Tag className={"flex gap-1 w-full " + className}>
        <span className={"min-w-0 truncate decoration-2 underline-offset-3 " + (clickable ? " hover:underline" : "")}>{title}</span>
        <span className={"shrink-0 responsive-text-hairline " + expClassName}>{exp}</span>
    </Tag>)
}

export function TitleMedia({media, ...props}: {media: Pick<iMedia, "title" | "year">} & tTitle) {
    return (<Title title={media.title} exp={media.year} parenthesis={false} {...props}/>)
}
