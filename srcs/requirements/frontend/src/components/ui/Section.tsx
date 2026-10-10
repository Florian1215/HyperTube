import {Link} from "@/i18n/navigation";
import React from "react";

export default function Section({children, title, href}: {children: React.ReactNode, title: string, href?: string}) {
    const className = "uppercase font-wide text-lg sm:text-xl font-bold";
    return (<section className="flex flex-col gap-2">
        {href ?
            <Link className={className + " hover:text-black-light"} href={href}>{title + " >"}</Link> :
            <span className={className}>{title}</span>}
        {children}
    </section>);
}
