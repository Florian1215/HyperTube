import React, {useEffect, useRef, useState} from "react";
import IconButton from "@/components/ui/Button/IconButton";
import smoothScrollTo from "@/utils/smoothScrollTo";
import {LeftArrowIcon, RightArrowIcon} from "@/components/Icons";

export default function HorizontalScroll({children, className}: {children: React.ReactNode, className?: string}) {
    const rowRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    useEffect(() => {
        const row = rowRef.current;
        if (!row)
            return;
        const update = () => {
            setCanScrollLeft(row.scrollLeft > 0);
            setCanScrollRight(row.scrollLeft + row.clientWidth < row.scrollWidth - 1);
        };
        const observer = new ResizeObserver(update);
        observer.observe(row);
        Array.from(row.children).forEach((child) => observer.observe(child));
        row.addEventListener("scroll", update, {passive: true});
        return () => {
            observer.disconnect();
            row.removeEventListener("scroll", update);
        };
    }, [children]);

    const scroll = (direction: 1 | -1) => {
        const row = rowRef.current;
        if (row)
            smoothScrollTo(row, row.scrollLeft + direction * row.clientWidth * 0.8);
    };

    const showArrows = canScrollLeft || canScrollRight;

    return (<div className="flex items-center gap-2">
        {showArrows && <IconButton disabled={!canScrollLeft} onClick={() => scroll(-1)} color="black" disabledColor="gray">
            {(color: string) => <LeftArrowIcon color={color}/>}
        </IconButton>}
        <div ref={rowRef} className={"flex min-w-0 flex-1 overflow-x-auto scrollbar-hide " + (className ?? "") + (canScrollRight ? " border-r" : "") + (canScrollLeft ? " border-l" : "")}>
            {children}
        </div>
        {showArrows && <IconButton disabled={!canScrollRight} onClick={() => scroll(1)} color="black" disabledColor="gray">
            {(color: string) => <RightArrowIcon color={color}/>}
        </IconButton>}
    </div>);
}
