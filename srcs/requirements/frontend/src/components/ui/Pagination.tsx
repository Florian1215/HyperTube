import {ReactNode} from "react";
import {LeftIcon, RightIcon} from "@/components/Icons";
import IconButton from "@/components/ui/Button/IconButton";

export default function Pagination({children, currentIndex, totalPage, onClick, variableMT=false} : {children: ReactNode, currentIndex: number, totalPage: number, onClick: (i: number) => void, variableMT?: boolean}) {
    const handleLeftArrow = () => {
        const index = currentIndex - 1;

        if (index > 0)
            onClick(index);
    }

    const handleRightArrow = () => {
        const index = currentIndex + 1;

        if (index < totalPage)
            onClick(index);
    }

    return (<div className="w-full">
        {children}
        {totalPage > 1 &&
            <div className={"flex w-full gap-2 justify-center " + (variableMT ? "mt-2 md:mt-4 xl:mt-6" : "mt4")}>
                <IconButton disabled={currentIndex === 1} className="mt-1" onClick={handleLeftArrow} color={"gray"}>
                    {(color: string) => <LeftIcon color={color}/>}
                </IconButton>

                {
                    totalPage > 5 ?
                        <>
                            <PageButton index={1} currentIndex={currentIndex} onClick={onClick}/>
                            {currentIndex !== 2 && <PageButton currentIndex={currentIndex} onClick={onClick}/>}
                            {currentIndex !== 1 && currentIndex !== totalPage && <PageButton index={currentIndex} currentIndex={currentIndex} onClick={onClick}/>}
                            {currentIndex !== totalPage - 1 && currentIndex > 2 && <PageButton currentIndex={currentIndex} onClick={onClick}/>}
                            <PageButton index={totalPage} currentIndex={currentIndex} onClick={onClick}/>
                        </>
                        :
                        Array.from({length: totalPage}, (_, i) => <PageButton key={i} index={i + 1} currentIndex={currentIndex} onClick={onClick}/>)
                }

                <IconButton disabled={currentIndex + 1 === totalPage} className="mt-1" onClick={handleRightArrow} color={"gray"}>
                    {(color: string) => <RightIcon color={color}/>}
                </IconButton>
        </div>}
    </div>);
}

function PageButton({index, currentIndex, onClick}: {index?: number, currentIndex: number, onClick: (i: number) => void}) {
    return (<button className={"custom-condensed text-2xl leading-6 " + (index === currentIndex ? "text-black font-bold" : "text-gray hover:underline")} onClick={() => {
        if (index && index !== currentIndex)
            onClick(index)
    }}>
        {index ?? "..."}
    </button>);
}
