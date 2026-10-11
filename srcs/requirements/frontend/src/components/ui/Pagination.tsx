import {ReactNode, useRef} from "react";
import {LeftIcon, RightIcon} from "@/components/Icons";
import IconButton from "@/components/ui/Button/IconButton";

function getPages(currentIndex: number, totalPage: number) {
    const shown = [1, currentIndex - 1, currentIndex, currentIndex + 1, totalPage].filter((page) => page >= 1 && page <= totalPage);
    const pages: (number | null)[] = [];

    [...new Set(shown)].sort((a, b) => a - b).forEach((page) => {
        const previous = pages.at(-1);

        if (previous && page - previous === 2)
            pages.push(page - 1);
        else if (previous && page - previous > 2)
            pages.push(null);
        pages.push(page);
    });
    return pages;
}

export default function Pagination({children, currentIndex, totalPage, onClick, variableMT=false} : {children: ReactNode, currentIndex: number, totalPage: number, onClick: (i: number) => void, variableMT?: boolean}) {
    const ref = useRef<HTMLDivElement>(null);

    const changePage = (index: number) => {
        onClick(index);
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        ref.current?.scrollIntoView({behavior: reducedMotion ? "auto" : "smooth", block: "start"});
    }

    const handleLeftArrow = () => {
        const index = currentIndex - 1;

        if (index > 0)
            changePage(index);
    }

    const handleRightArrow = () => {
        const index = currentIndex + 1;

        if (index <= totalPage)
            changePage(index);
    }

    return (<div ref={ref} className="w-full scroll-mt-20">
        {children}
        {totalPage > 1 &&
            <div className={`flex w-full gap-2 justify-center ${variableMT ? "mt-2 md:mt-4 xl:mt-6" : "mt4"}`}>
                <IconButton accent={true} disabled={currentIndex === 1} className="mt-1" onClick={handleLeftArrow} color={"gray"}>
                    {(color: string) => <LeftIcon color={color}/>}
                </IconButton>

                {getPages(currentIndex, totalPage).map((page, i) => page === null ?
                    <span key={`gap-${i}`} className="custom-condensed text-2xl leading-6 text-gray">...</span> :
                    <PageButton key={page} index={page} currentIndex={currentIndex} onClick={changePage}/>)}

                <IconButton accent={true} disabled={currentIndex === totalPage} className="mt-1" onClick={handleRightArrow} color={"gray"}>
                    {(color: string) => <RightIcon color={color}/>}
                </IconButton>
        </div>}
    </div>);
}

function PageButton({index, currentIndex, onClick}: {index: number, currentIndex: number, onClick: (i: number) => void}) {
    return (<button className={`custom-condensed text-2xl leading-6 ${index === currentIndex ? "text-dblack font-bold" : "text-gray hover:text-accent"}`} onClick={() => {
        if (index !== currentIndex)
            onClick(index)
    }}>
        {index}
    </button>);
}
