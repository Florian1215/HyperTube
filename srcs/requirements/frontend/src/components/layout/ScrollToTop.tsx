"use client";

import {useEffect, useRef} from "react";
import {usePathname} from "@/i18n/navigation";

export default function ScrollToTop() {
    const pathname = usePathname();
    const isHistoryNavigation = useRef(false);

    useEffect(() => {
        const onPopState = () => {isHistoryNavigation.current = true;};

        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, []);

    useEffect(() => {
        if (!isHistoryNavigation.current)
            window.scrollTo(0, 0);
        isHistoryNavigation.current = false;
    }, [pathname]);

    return null;
}
