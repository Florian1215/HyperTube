import React from "react";

export default function TagButton({children, onClick, className, selected=false, disabled=false}: {children: React.ReactNode, onClick: () => void, className?: string, selected?: boolean, disabled?: boolean}) {
    return (<button
        disabled={disabled} onClick={onClick} type="button"
        className={"text-nowrap px-3 custom-condensed spacin border tracking-wide text-2xl custom-shadow-animation-s " + (selected ? "text-white bg-black " : "bg-white ") + (className ?? "")}>
        {children}
    </button>);
}
