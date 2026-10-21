"use client";

import React, {useState} from "react";
import {useTranslations} from "next-intl";
import {useQueryClient} from "@tanstack/react-query";
import useModal, {ModalState} from "@/contexts/ModalContext";
import useAuth from "@/contexts/AuthContext";
import useNotification from "@/contexts/NotificationContext";
import ModalLayout from "@/components/layout/ModalLayout";
import Button from "@/components/ui/Button/Button";
import {logMediaProgress, syncMediaProgress} from "@/services/medias.service";
import {ApiError} from "@/services/apiClient";
import {RewatchIcon} from "@/components/Icons";
import {iUser} from "@/types/user";

const toDateInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default function LogMediaModal() {
    const {activeModal, closeModal} = useModal();
    const {user} = useAuth();

    if (activeModal.type !== "log-media" || !activeModal.logMedia || !user)
        return null;
    return (<LogMediaForm target={activeModal.logMedia} user={user} closeAction={closeModal}/>);
}

function LogMediaForm({target, user, closeAction}: {target: NonNullable<ModalState["logMedia"]>, user: iUser, closeAction: () => void}) {
    const t = useTranslations("modal.logMedia");
    const tError = useTranslations("notifications.error");
    const {addNotification} = useNotification();
    const queryClient = useQueryClient();
    const today = toDateInput(new Date());
    const [date, setDate] = useState(today);
    const [rewatch, setRewatch] = useState(target.rewatch);
    const [saving, setSaving] = useState(false);
    const {media, seasonNumber, episodeNumber} = target;

    const save = async () => {
        setSaving(true);
        try {
            const watchedAt = date === today ? new Date() : new Date(`${date}T12:00:00`);
            const data = await logMediaProgress(media.id, media.type, watchedAt.toISOString(), rewatch, seasonNumber, episodeNumber);
            syncMediaProgress(queryClient, user.id, media, data, episodeNumber);
            closeAction();
        } catch (e) {
            addNotification(tError("failedChangeProgression", {error: e instanceof ApiError ? e.message : String(e)}), "error");
            setSaving(false);
        }
    };

    return (<ModalLayout title={t("title")} onCloseAction={closeAction}>
        <div className="space-y-6 w-full">
            <p className="font-semibold uppercase truncate">{media.title}</p>
            <label className="block w-full">
                <span className="font-normal text-lg">{t("date")}</span>
                <input type="date" value={date} max={today} required onChange={(e) => setDate(e.target.value)}
                       className="block w-full mt-2 py-1 bg-dwhite text-dblack border-b focus:border-b-2"/>
            </label>
            <button type="button" aria-pressed={rewatch} onClick={() => setRewatch(!rewatch)}
                    className={`flex items-center gap-2 font-normal text-lg transition-colors ${rewatch ? "text-dblack" : "text-gray"}`}>
                <RewatchIcon size={24} color="current"/>
                {t("rewatch")}
            </button>
            <Button className="w-full" onClick={!saving && date ? () => void save() : undefined}>{t("save")}</Button>
        </div>
    </ModalLayout>);
}
