import React from "react";
import {useTranslations} from "next-intl";
import {CommentIcon} from "@/components/Icons";

export default function CommentBadge() {
    const tMedia = useTranslations("media");

    return (<span title={tMedia("commented")} className="absolute -bottom-1 -right-1 z-10 flex items-center justify-center size-4">
        <CommentIcon size={12} color="dblack"/>
    </span>);
}
