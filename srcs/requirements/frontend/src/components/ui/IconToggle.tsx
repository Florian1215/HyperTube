import {ReactNode} from "react";

export default function IconToggle({val, setter, icon, children, className=""}: {val: boolean, setter: (val: boolean) => void, icon: ReactNode, children: ReactNode, className?: string}) {
    return (<button type="button" aria-pressed={val} onClick={() => setter(!val)}
                    className={`flex items-center gap-2 font-normal text-lg text-left transition-colors ${val ? "text-dblack" : "text-gray"} ${className}`}>
        <span className="shrink-0">{icon}</span>
        {children}
    </button>);
}
