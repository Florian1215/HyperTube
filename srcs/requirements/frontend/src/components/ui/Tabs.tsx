import React from "react";
import HorizontalScroll from "@/components/ui/HorizontalScroll";

// Tab bar. When the tabs do not fit, arrows are displayed to scroll through them.
export default function Tabs({tabs, activeTab, onChange}: {tabs: string[], activeTab: number, onChange: (index: number) => void}) {
    return (<HorizontalScroll className="h-12 sm:h-16">
        <div className="border-b border-r w-12" />
        {tabs.map((tab, index) => (<button
            key={index}
            className={"custom-condensed text-2xl sm:text-3xl md:text-4xl tracking-wide sm:tracking-normal border-t border-r px-3 sm:px-12 xl:px-16 border-b text-nowrap" + (activeTab === index ? " border-b-white" : "")}
            onClick={(e) => {
                // a partially hidden tab is scrolled fully into view; the first and last ones go to the very edge
                // so that the blocks around them (and their border) are visible too
                const row = e.currentTarget.parentElement;
                if (row) {
                    const rowRect = row.getBoundingClientRect();
                    const tabRect = e.currentTarget.getBoundingClientRect();
                    if (index === 0)
                        row.scrollTo({left: 0, behavior: "smooth"});
                    else if (index === tabs.length - 1)
                        row.scrollTo({left: row.scrollWidth, behavior: "smooth"});
                    else if (tabRect.left < rowRect.left)
                        row.scrollBy({left: tabRect.left - rowRect.left, behavior: "smooth"});
                    else if (tabRect.right > rowRect.right)
                        row.scrollBy({left: tabRect.right - rowRect.right, behavior: "smooth"});
                }
                onChange(index);
            }}>{tab}</button>))}
        <div className="border-b flex-1 min-w-0" />
    </HorizontalScroll>);
}
