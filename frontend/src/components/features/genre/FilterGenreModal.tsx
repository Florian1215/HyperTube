"use client";

import useModal from "@/contexts/ModalContext";
import {useLocale, useTranslations} from "next-intl";
import {useEffect, useState} from "react";
import {iGenre} from "@/types/genre";
import {useGenres} from "@/hooks/useGenres";
import {tLocale} from "@/i18n/request";
import ModalLayout from "@/components/layout/ModalLayout";
import {CheckFillIcon} from "@/components/Icons";
import Button from "@/components/ui/Button/Button";

export default function FilterGenreModal() {
    const {activeModal, closeModal,} = useModal();
    const t = useTranslations("modal.filterGenre");
    const [modalFilterGenre, setModalFilterGenre] = useState<iGenre[]>([]);
    const locale = useLocale() as tLocale;
    const {data} = useGenres(locale);

    useEffect(() => {
        if (activeModal.filterGenre !== undefined)
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setModalFilterGenre(activeModal.filterGenre[0]);
    }, [activeModal.filterGenre]);

    if (activeModal.type !== "filter-genre" || activeModal.filterGenre === undefined)
        return null;

    const handleSelection = (genre: iGenre) => {
        let newGenres;
        if (modalFilterGenre.includes(genre))
            newGenres = modalFilterGenre.filter(g => g !== genre);
        else
            newGenres = [...modalFilterGenre, genre];
        if (activeModal.filterGenre !== undefined)
            activeModal.filterGenre[1](newGenres);
        setModalFilterGenre(newGenres);
    }

    return (<ModalLayout onCloseAction={closeModal} title={t("title")}>
        <div className="flex flex-col gap-2">
            {data?.genres.map(genre => (
                <button key={genre.id} className="flex gap-2" onClick={() => handleSelection(genre)}>
                    <div className={"size-5 " + (modalFilterGenre.includes(genre) ? "" : "border")}>
                        <CheckFillIcon className={modalFilterGenre.includes(genre) ? "" : "hidden"}/>
                    </div>
                    <p>{genre.name}</p>
                </button>))}
        </div>
        <Button className="mt-5" onClick={closeModal}>{t("apply")}</Button>
    </ModalLayout>);
}
