"use client";

import React, {useEffect} from "react";
import CloseButton from "@/components/ui/Button/CloseButton";

export default function ModalLayout({children, onCloseAction, title, addMaxWTitle=false}: {children: React.ReactNode, onCloseAction: () => void, title: string, addMaxWTitle?: boolean}) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape")
                onCloseAction();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [onCloseAction]);

    return (<div onClick={onCloseAction} className="fixed inset-0 flex justify-center items-center z-50 bg-black/50">
        <div onClick={(e) => e.stopPropagation()} className="p-6 z-60 bg-white custom-shadow-m border min-w-9/10 sm:min-w-90 max-w-9/10 sm:max-w-none">
            <div className="flex flex-col items-start">
                <div className="flex justify-between mb-8 w-full">
                    <span className={"uppercase font-wide font-bold font-8xl" + (addMaxWTitle ? " max-w-70" : "")}>{title}</span>
                    <CloseButton onClickAction={onCloseAction} />
                </div>
                {children}
            </div>
        </div>
        <div className="custom-noise-bg z-40" />
    </div>);
}
