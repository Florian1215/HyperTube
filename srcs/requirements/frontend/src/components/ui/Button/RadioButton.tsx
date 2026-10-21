import {CURRENT_COLOR_HIGHLIGHT, useHoverEffect} from "@/components/ui/HoverEffect";

export default function RadioButton({children, selected, onClick}: {children: string, selected: boolean, onClick: () => void}) {
    const hover = useHoverEffect({disabled: selected, shift: 6, scale: 1.05, highlightColor: CURRENT_COLOR_HIGHLIGHT});

    return (<button {...hover.handlers} {...hover.moveProps}
        className={`group/hover relative ${hover.hoverClassName} ${hover.moveClassName} uppercase whitespace-nowrap px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm border border-black-light ${selected ? "text-dwhite bg-dblack" : "text-dblack bg-dwhite hover:bg-dwhite-light"}`}
        onClick={onClick}>
        {children}
        {hover.highlight}
    </button>);
}
