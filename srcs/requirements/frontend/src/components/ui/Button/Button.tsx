import React from "react";

export default function Button({children, onClick, className, disabled=false, darkMode=true}: {children: React.ReactNode, onClick: () => void, className?: string, disabled?: boolean, darkMode?: boolean}) {
    const colorClassFG = darkMode ? "text-dwhite" : "text-white";
    const colorClassBG = darkMode ? "bg-dblack hover:bg-dblack-light" : "bg-black hover:bg-black-light";

    return (<button
        disabled={disabled} onClick={onClick} type="button"
        className={`uppercase text-nowrap px-3 sm:px-5 h-8 sm:h-10 text-sm sm:text-base xl:text-lg ${colorClassFG} ${disabled ? "bg-gray" : colorClassBG} ${className}`}>
        {children}
    </button>);
}
