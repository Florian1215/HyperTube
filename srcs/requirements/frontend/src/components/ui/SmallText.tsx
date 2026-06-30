import {ReactNode} from "react";

export default function SmallText({children, className}: {children: ReactNode, className?: string}) {
    return (<p className={"text-center italic text-gray " + className}>{children}</p>);
}
