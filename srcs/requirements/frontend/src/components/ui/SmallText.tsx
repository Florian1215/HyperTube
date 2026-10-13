import {ReactNode} from "react";

export default function SmallText({children, className, italic=true}: {children: ReactNode, className?: string, italic?: boolean}) {
    return (<p className={`text-xs sm:text-sm text-center ${italic ? "italic" : ""} text-gray ${className}`}>{children}</p>);
}
