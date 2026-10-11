"use client";

import {CrossIcon} from "@/components/Icons";
import IconButton from "@/components/ui/Button/IconButton";

export default function CloseButton({onClickAction, size = 30, className, disabled=false, color}: {onClickAction: () => void, size?: number, className?: string, disabled?: boolean, color?: string}) {
    return (<IconButton className={`text-nowrap ${className}`} disabled={disabled} onClick={onClickAction} color={color} disabledColor={"dwhite"}>
        {(color: string) => <CrossIcon color={color} size={size} className={(color === "black-light" ? "stroke-2 stroke-black-light" : "")}/>}
    </IconButton>);
}
