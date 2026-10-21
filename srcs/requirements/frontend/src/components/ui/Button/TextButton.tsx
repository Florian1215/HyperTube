import {ReactNode} from "react";

export default function TextButton({children, onClick, className} : {children: ReactNode, onClick: () => void, className?: string}) {
    return (<button
        className={`text-sm font-light text-gray whitespace-nowrap ${className ?? "hover:text-dblack"}`}
        onClick={onClick}>
        {children}
    </button>);
}
