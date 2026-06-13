"use client";

import React, {createContext, Dispatch, SetStateAction, useContext, useEffect, useState} from "react";
import {iGenre} from "@/types/genre";

type ModalType = | "signin" | "register" | "genre" | "filter-genre" | "send-email-forgot-password" | "set-new-password" | "delete-comment" | null;

interface ModalState {
    type: ModalType;
    genres?: number[];
    filterGenre?: [filterGenre: iGenre[], handleFilterGenre: (newGenres: iGenre[]) => void];
    setFilterGenre?: Dispatch<SetStateAction<iGenre[]>>
    commentId?: number
    deleteComment?: (commentId: number) => void
    token?: string
}

interface ModalContextType {
    activeModal: ModalState;
    openModal: (modal: ModalState) => void;
    closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function ModalProvider({children}: {children: React.ReactNode}) {
    const [activeModal, setActiveModal] = useState<ModalState>({type: null});

    const openModal = (modal: ModalState) => setActiveModal(modal);
    const closeModal = () => setActiveModal({type: null});

    useEffect(() => {
        if (activeModal.type !== null) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }

        return () => {document.body.style.overflow = "";};
    }, [activeModal]);

    return (<ModalContext.Provider value={{activeModal, openModal, closeModal,}}>
        {children}
    </ModalContext.Provider>);
}

export default function useModal() {
    const context = useContext(ModalContext);
    if (!context)
        throw new Error("useModal must be used inside ModalProvider");
    return context;
}
