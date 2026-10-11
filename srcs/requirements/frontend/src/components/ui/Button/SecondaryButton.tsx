import {ReactNode} from "react";

export default function SecondaryButton({children, onClick, className, onContextMenu, darkMode=true} : {children: ReactNode, onClick?: () => void, className?: string, onContextMenu?: () => void, darkMode?: boolean}) {
    const colorClassFG = darkMode ? "text-dblack" : "text-black";
    const colorClassBG = darkMode ? "bg-dwhite hover:bg-dwhite-light" : "bg-white hover:bg-white-light";

    return (<button
        className={`uppercase text-nowrap px-3 sm:px-5 h-8 sm:h-10 text-sm sm:text-base xl:text-lg ${colorClassBG} ${onClick ? colorClassFG : "text-gray"} ${className}`}
        disabled={!onClick} onClick={onClick} onContextMenu={onContextMenu} >
        {children}
    </button>);
}
