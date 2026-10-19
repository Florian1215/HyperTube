import React, {useEffect, useRef, useState} from "react";
import IconButton from "@/components/ui/Button/IconButton";
import smoothScrollTo from "@/utils/smoothScrollTo";
import {LeftArrowIcon, RightArrowIcon} from "@/components/Icons";

export default function HorizontalScroll({children, className, borderB=false}: {children: React.ReactNode, className?: string, borderB?: boolean}) {
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
    const arrowClassName = borderB ? "self-stretch flex items-center border-b border-b-cblack" : "";

    return (<div className={`flex items-center ${borderB ? "" : "gap-2"}`}>
        {showArrows && <div className={`${arrowClassName} ${borderB ? `pr-2 ${canScrollLeft ? "border-r" : ""}` : ""}`}>
            <IconButton disabled={!canScrollLeft} onClick={() => scroll(-1)} color="dblack" disabledColor="gray">
                <LeftArrowIcon color="current"/>
            </IconButton>
        </div>}
        <div ref={rowRef} className={`flex min-w-0 flex-1 overflow-x-auto scrollbar-hide -my-1.5 ${borderB ? "py-1.5" : `p-1.5 ${canScrollRight ? "border-r" : ""} ${canScrollLeft ? "border-l" : ""}`} ${className ?? ""}`}>
            {children}
        </div>
        {showArrows && <div className={`${arrowClassName} ${borderB ? `pl-2 ${canScrollRight ? "border-l" : ""}` : ""}`}>
            <IconButton disabled={!canScrollRight} onClick={() => scroll(1)} color="dblack" disabledColor="gray">
                <RightArrowIcon color="current"/>
            </IconButton>
        </div>}
    </div>);
}
