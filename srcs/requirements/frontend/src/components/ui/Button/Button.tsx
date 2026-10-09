import React from "react";

export default function Button({children, onClick, className, disabled=false}: {children: React.ReactNode, onClick: () => void, className?: string, disabled?: boolean}) {
    return (<button
        disabled={disabled} onClick={onClick} type="button"
        className={"uppercase text-nowrap px-3 sm:px-5 h-8 sm:h-10 text-dwhite text-sm sm:text-base xl:text-lg " + (disabled ? "bg-gray " : "bg-dblack hover:bg-dblack-light ") + className}>
        {children}
    </button>);
}
