import React from "react";
import HorizontalScroll from "@/components/ui/HorizontalScroll";

export default function Tabs({tabs, counts, activeTab, onChange}: {tabs: string[], counts?: (number | undefined)[], activeTab: number, onChange: (index: number) => void}) {
    return (<HorizontalScroll className="h-12 sm:h-16">
        <div className="border-b border-r w-12" />
        {tabs.map((tab, index) => (<button
            key={index}
            className={"custom-condensed text-2xl sm:text-3xl md:text-4xl tracking-wide sm:tracking-normal border-t border-r px-3 sm:px-12 xl:px-16 border-b text-nowrap" + (activeTab === index ? " border-b-white" : "")}
            onClick={() => onChange(index)}>
            {tab}
            {counts?.[index] !== undefined && <span className="font-hairline tracking-normal text-xs sm:text-sm md:text-base align-top ml-1">({counts[index]})</span>}
        </button>))}
        <div className="border-b flex-1 min-w-0" />
    </HorizontalScroll>);
}
