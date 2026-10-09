"use client";

import React, {useEffect, useRef} from "react";
import useModal from "@/contexts/ModalContext";
import Search from "@/components/Search";
import Navbar from "@/components/layout/Navbar";
import {usePathname} from "@/i18n/navigation";

export default function SearchModal() {
    const {searchOpen, closeSearch, activeModal} = useModal();
    const mouseDownTarget = useRef<EventTarget | null>(null);
    const hasModal = activeModal.type !== null;
    const pathname = usePathname();

    useEffect(() => {
        if (!searchOpen || hasModal)
            return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape")
                closeSearch();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [searchOpen, hasModal, closeSearch]);

    useEffect(() => {
        closeSearch();
    }, [pathname, closeSearch]);

    if (!searchOpen)
        return null;

    const isBackground = (e: React.MouseEvent) => e.target === e.currentTarget || (e.target as HTMLElement).dataset.searchBackground !== undefined;

    return (<div className="fixed inset-0 z-40 bg-black/70">
        <div className="custom-noise-bg"/>
        <div className="absolute inset-0 overflow-y-auto overscroll-contain"
             onMouseDown={(e) => {mouseDownTarget.current = e.target;}}
             onMouseUp={(e) => {
                 if (isBackground(e) && mouseDownTarget.current === e.target)
                     closeSearch();
                 mouseDownTarget.current = null;
             }}
             onClick={(e) => {
                 if ((e.target as HTMLElement).closest("a"))
                     closeSearch();
             }}>
            <div className="bg-white">
                <Navbar/>
            </div>
            <Search modal={true}/>
        </div>
    </div>);
}
