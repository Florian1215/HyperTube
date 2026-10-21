import React from "react";
import {CURRENT_COLOR_HIGHLIGHT, useHoverEffect} from "@/components/ui/HoverEffect";

export default function TagButton({children, onClick, className, selected=false, disabled=false}: {children: React.ReactNode, onClick: () => void, className?: string, selected?: boolean, disabled?: boolean}) {
    const hover = useHoverEffect({disabled, shift: 6, scale: 1.05, highlightColor: CURRENT_COLOR_HIGHLIGHT});

    return (<span {...hover.handlers} className={`group/hover relative inline-flex bg-cblack ${hover.hoverClassName} ${className ?? ""}`}>
        <button {...hover.moveProps}
            disabled={disabled} onClick={onClick} type="button"
            className={`relative w-full whitespace-nowrap px-3 custom-condensed spacin border tracking-wide text-2xl custom-shadow-animation-s leading-none py-1 group-hover/hover:[--shadow-shift:-3px] ${selected ? "text-white bg-black" : "bg-white text-black"}`}>
            {children}
            {hover.highlight}
        </button>
    </span>);
}
