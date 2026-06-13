"use client";

import {useState} from "react";
import {CrossIcon} from "@/components/Icons";

export default function CloseButton({onClickAction, size = 30, className, disabled=false}: {onClickAction: () => void, size?: number, className?: string, disabled?: boolean}) {
    const [isHover, setIsHover] = useState(false);
    let color;

    if (disabled)
        color = "white";
    else if (isHover)
        color = "black-hover";
    else
        color = "black";

    return (<button disabled={disabled} onClick={onClickAction}
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        className={"text-nowrap " + className}>
        <CrossIcon color={color} size={size} className={(isHover ? "stroke-2 stroke-black-hover" : "")}/>
    </button>);
}
