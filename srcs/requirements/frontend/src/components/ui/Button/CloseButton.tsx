"use client";

import {CrossIcon} from "@/components/Icons";
import IconButton, {tIconColor} from "@/components/ui/Button/IconButton";

export default function CloseButton({onClickAction, size = 30, className, disabled=false, color}: {onClickAction: () => void, size?: number, className?: string, disabled?: boolean, color?: tIconColor}) {
    return (<IconButton className={`text-nowrap ${className}`} disabled={disabled} onClick={onClickAction} color={color} disabledColor={"dwhite"}>
        <CrossIcon color="current" size={size} className={color ? "" : "group-enabled:group-hover:stroke-2"}/>
    </IconButton>);
}
