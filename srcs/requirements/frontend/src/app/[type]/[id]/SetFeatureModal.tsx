"use client";

import useModal from "@/contexts/ModalContext";
import {useLocale, useTranslations} from "next-intl";
import React, {useEffect, useState} from "react";
import ModalLayout from "@/components/layout/ModalLayout";
import Button from "@/components/ui/Button/Button";
import {updateMediaFeature} from "@/services/medias.service";
import LoadingImage from "@/components/ui/LoadingImage";
import useNotification from "@/contexts/NotificationContext";
import {ApiError} from "@/services/apiClient";
import {tLocale} from "@/i18n/routing";
import {addQuery, removeQuery, updateMedia, updateMediaBackdrop} from "@/hooks/useApiQuery";
import {useQueryClient} from "@tanstack/react-query";
import {iMediaDetails} from "@/types/media";
import {StarIcon} from "@/components/Icons";
import IconToggle from "@/components/ui/IconToggle";

export default function SetFeatureModal() {
    const {activeModal, closeModal} = useModal();
    const t = useTranslations("media.feature");
    const [backdropSelected, setBackdropSelected] = useState(0);
    const [feature, setFeature] = useState(true);
    const {addNotification} = useNotification();
    const locale = useLocale() as tLocale;
    const queryClient = useQueryClient();
    const [disableBtn, setDisableBtn] = useState(true);

    const saveChange = async () => {
        const m = structuredClone(activeModal.media);
        if (m) {
            try {
                const res = await updateMediaFeature(locale, m.type, m.id, feature, m.backdrops_url[backdropSelected]);
                if (m.backdrop_url != res.backdrop_url) {
                    m.backdrop_url = res.backdrop_url;
                    updateMediaBackdrop(queryClient, m);
                    updateMedia(queryClient, m);
                }
                if (feature)
                    addQuery(queryClient, ["medias", m.type, "featured", 1], m);
                else
                    removeQuery(queryClient, ["medias", m.type, "featured"], m.id);
                closeModal();
            } catch (e) {
                addNotification(t("requestError", {error: e instanceof ApiError ? e.message : String(e)}), "error");
            }
        }
    }

    useEffect(() => {
        if (activeModal.media) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setBackdropSelected(activeModal.media.backdrops_url.findIndex(s => s === activeModal.media?.backdrop_url))
            setFeature(activeModal.media.feature);
        }
    }, [activeModal])

    useEffect(() => {
        const m = activeModal.media;
        if (m)
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDisableBtn(m.feature === feature && m.backdrops_url[backdropSelected] === m.backdrop_url);
    }, [activeModal, backdropSelected, feature])

    if (activeModal.type !== "set-feature" || activeModal.media === undefined)
        return null;

    const displayBackdrop = activeModal.media.backdrops_url.length > 1;
    return (<ModalLayout title={t("title")} onCloseAction={closeModal} addMaxWTitle={false}>
        <div className={`flex flex-col justify-between gap-2 text-center ${displayBackdrop ? "w-full md:w-2xl lg:w-4xl" : "w-full"}`}>
            {
                displayBackdrop &&
                <div className="w-full text-left space-y-1">
                    <p className="font-normal text-lg">{t("chooseBackdrop")}</p>
                    <div className="overflow-y-auto max-h-80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 size-full gap-2">
                        {activeModal.media.backdrops_url.map((url, index) => {
                            if (activeModal.media)
                                return (<MediaHero key={index} media={activeModal.media} backdrop_url={url} setIdx={() => setBackdropSelected(index)} selected={backdropSelected === index}/>);
                        })}
                    </div>
                </div>
            }
            <IconToggle val={feature} setter={setFeature} icon={<StarIcon size={24} color="current"/>} className="p-2">
                {t("feature")}
            </IconToggle>
            <Button className="w-fit mx-auto" onClick={saveChange} disabled={disableBtn}>
                {t("save")}
            </Button>
        </div>
    </ModalLayout>)
}

function MediaHero({media, backdrop_url, selected, setIdx}: {media: iMediaDetails, backdrop_url: string, selected: boolean, setIdx: () => void}) {
    const t = useTranslations("media");

    return (<button onClick={setIdx}>
        <div className={`relative flex flex-col items-center gap-4 aspect-video xl:aspect-21/9 border ${selected ? "border-3" : ""}`}>
            <LoadingImage key={backdrop_url} className="absolute inset-0 size-full object-cover"
                                                width={1000} height={1000} loading="eager"
                                                src={backdrop_url} alt={t("posterAlt", { title: media.title })}/>
            <div className="absolute inset-0 text-white flex items-end justify-center text-center mx-auto">
                <div className="custom-noise" />
                <div className="bg-gradient" />
            </div>
        </div>
    </button>);
}
