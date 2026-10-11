import {StarIcon} from "@/components/Icons";
import React from "react";
import {iMedia} from "@/types/media";

export default function Rating({media, className, after=false}: {media?: iMedia, className?: string, after?: boolean}) {
    const icon = <StarIcon color="accent"/>;
    return (<div className="flex gap-1.5 items-center">
        {after ? icon : null}
        {media ? <p className={"tracking-widest text-dblack " + className}>{media.rating.toFixed(1)}</p> :
            <div className="h-5.5 w-5">
                <div className="custom-loading"/>
            </div>
        }
        {after ? null : icon}
    </div>);
}
