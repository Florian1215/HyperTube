import React, {useEffect, useRef, useState} from "react";
import IconButton from "@/components/ui/Button/IconButton";
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
            setCanScrollLeft(row.scrollLeft > 1);
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
        row?.scrollBy({left: direction * row.clientWidth * 0.8, behavior: "smooth"});
    };

    const showArrows = canScrollLeft || canScrollRight;

    return (<div className="flex items-center gap-2">
        {showArrows && <IconButton disabled={!canScrollLeft} onClick={() => scroll(-1)} color="black" disabledColor="gray">
            {(color: string) => <LeftArrowIcon color={color}/>}
        </IconButton>}
        {/* the edge borders are drawn over the row: putting them on the row itself would shift its content while it scrolls */}
        <div className="relative flex min-w-0 flex-1">
            <div ref={rowRef} className={"flex min-w-0 flex-1 overflow-x-auto scrollbar-hide " + (className ?? "")}>
                {children}
            </div>
            {canScrollLeft && <div className="absolute inset-y-0 left-0 border-l pointer-events-none"/>}
            {canScrollRight && <div className="absolute inset-y-0 right-0 border-r pointer-events-none"/>}
        </div>
        {showArrows && <IconButton disabled={!canScrollRight} onClick={() => scroll(1)} color="black" disabledColor="gray">
            {(color: string) => <RightArrowIcon color={color}/>}
        </IconButton>}
    </div>);
}
