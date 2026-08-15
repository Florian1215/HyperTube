"use client";

import useModal from "@/contexts/ModalContext";
import {useLocale, useTranslations} from "next-intl";
import React, {useEffect, useState} from "react";
import ModalLayout from "@/components/layout/ModalLayout";
import Button from "@/components/ui/Button/Button";
import {updateMovieFeature} from "@/services/movies.service";
import {iMovieDetails} from "@/types/movie";
import Image from "next/image";
import Toggle from "@/components/ui/Toggle";
import useNotification from "@/contexts/NotificationContext";
import {ApiError} from "@/services/apiClient";
import {tLocale} from "@/i18n/request";

export default function SetFeatureModal() {
    const {activeModal, closeModal} = useModal();
    const t = useTranslations("movie.feature");
    const [backdropSelected, setBackdropSelected] = useState(0);
    const [feature, setFeature] = useState(true);
    const {addNotification} = useNotification();
    const locale = useLocale() as tLocale;

    const saveChange = async () => {
        const m = activeModal.movie;
        if (m) {
            try {
                await updateMovieFeature(locale, m.id, feature, m.backdrops_url[backdropSelected]);
                //todo updaye cach
                closeModal();
            } catch (e) {
                addNotification(t("requestError", {error: e instanceof ApiError ? e.message : String(e)}), "error");
            }
        }
    }

    useEffect(() => {
        if (activeModal.movie)
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setBackdropSelected(activeModal.movie.backdrops_url.findIndex(s => s === activeModal.movie?.backdrop_url))
    }, [activeModal])

    if (activeModal.type !== "set-feature" || activeModal.movie === undefined)
        return null;

    const displayBackdrop = activeModal.movie.backdrops_url.length > 1;
    return (<ModalLayout title={t("title")} onCloseAction={closeModal}>
        <div className={"space-y-6 text-center " + (displayBackdrop ? "w-full md:w-2xl lg:w-4xl" : "w-full")}>
            {
                displayBackdrop &&
                <div className="w-full text-left space-y-1">
                    <p className="font-normal text-lg">{t("chooseBackdrop")}</p>
                    <div className="overflow-y-auto max-h-80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 size-full gap-2">
                        {activeModal.movie.backdrops_url.map((url, index) => {
                            if (activeModal.movie)
                                return (<MovieHero key={index} movie={activeModal.movie} backdrop_url={url} setIdx={() => setBackdropSelected(index)} selected={backdropSelected === index}/>);
                        })}
                    </div>
                </div>
            }
            <div className="w-full text-left">
                <p className="font-normal text-lg">{t("feature")}</p>
                <Toggle val={feature} setter={setFeature}/>
            </div>
            <Button onClick={saveChange}>
                {t("save")}
            </Button>
        </div>
    </ModalLayout>)
}

function MovieHero({movie, backdrop_url, selected, setIdx}: {movie: iMovieDetails, backdrop_url: string, selected: boolean, setIdx: () => void}) {
    const t = useTranslations("movie");
    const [isLoaded, setIsLoaded] = useState(false);

    return (<button onClick={setIdx}>
        <div className={"relative flex flex-col items-center gap-4 aspect-video xl:aspect-21/9 border" + (selected ? " border-3" : "")}>
            <Image className={"absolute inset-0 size-full object-cover " + (isLoaded ? "opacity-100" : "opacity-0")}
                                                width={1000} height={1000} loading="eager"
                                                onLoad={() => setIsLoaded(true)}
                                                src={backdrop_url} alt={t("posterAlt", { title: movie.title })}/>)
            <div className="absolute inset-0 text-white flex items-end justify-center text-center mx-auto">
                <div className="custom-noise" />
                <div className={isLoaded ? "bg-gradient" : "custom-loading"} />
            </div>
        </div>
    </button>);
}
