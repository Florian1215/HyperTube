"use client";

import React, {createContext, Dispatch, SetStateAction, useCallback, useContext, useEffect, useState} from "react";
import {iGenre} from "@/types/genre";
import {iMediaDetails, iPeople, iTorrent} from "@/types/media";

type ModalType = "signin" | "register" | "genre" | "filter-genre" | "set-new-password" | "delete-confirmation" | "select-torrent" | "credits" | "watched-by" | "set-feature" | null;

export interface ModalState {
    type: ModalType;
    genres?: number[];
    filterGenre?: [filterGenre: iGenre[], handleFilterGenre: (newGenres: iGenre[]) => void];
    setFilterGenre?: Dispatch<SetStateAction<iGenre[]>>
    deleteObjId?: number
    deleteFunc?: (objId: number) => Promise<void>;
    token?: string
    torrents?: iTorrent[]
    setTorrentId?: (selectTorrentId: string) => void
    noClose?: boolean
    reload?: () => void
    appId?: number
    pageIndex?: number
    cast?: iPeople[]
    crew?: iPeople[]
    media?: iMediaDetails
    tab?: "info" | "cast" | "crew"
}

interface ModalContextType {
    activeModal: ModalState;
    openModal: (modal: ModalState) => void;
    closeModal: () => void;
    searchOpen: boolean;
    openSearch: () => void;
    closeSearch: () => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function ModalProvider({children}: {children: React.ReactNode}) {
    const [activeModal, setActiveModal] = useState<ModalState>({type: null});

    const openModal = (modal: ModalState) => setActiveModal(modal);
    const closeModal = () => setActiveModal({type: null});
    const [searchOpen, setSearchOpen] = useState(false);
    const openSearch = useCallback(() => setSearchOpen(true), []);
    const closeSearch = useCallback(() => setSearchOpen(false), []);

    useEffect(() => {
        if (activeModal.type !== null || searchOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }

        return () => {document.body.style.overflow = "";};
    }, [activeModal, searchOpen]);

    return (<ModalContext.Provider value={{activeModal, openModal, closeModal, searchOpen, openSearch, closeSearch}}>
        {children}
    </ModalContext.Provider>);
}

export default function useModal() {
    const context = useContext(ModalContext);
    if (!context)
        throw new Error("useModal must be used inside ModalProvider");
    return context;
}
