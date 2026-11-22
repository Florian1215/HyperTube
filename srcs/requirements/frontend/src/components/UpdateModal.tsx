"use client";

import React from "react";
import {useLocale, useTranslations} from "next-intl";
import useModal from "@/contexts/ModalContext";
import ModalLayout from "@/components/layout/ModalLayout";
import Markdown from "@/components/Markdown";
import SmallText from "@/components/ui/SmallText";

export default function UpdateModal() {
    const {activeModal, closeModal} = useModal();
    const t = useTranslations("updates");
    const locale = useLocale();
    const update = activeModal.update;

    if (activeModal.type !== "update" || !update)
        return null;

    return (<ModalLayout title={t("title", {version: update.version})} onCloseAction={closeModal}>
        <div className="w-full sm:w-xl max-h-[70vh] overflow-y-auto pr-1">
            <SmallText>{new Date(update.published_at).toLocaleDateString(locale, {day: "numeric", month: "long", year: "numeric"})}</SmallText>
            <Markdown className="mt-4 text-left">{update.content}</Markdown>
        </div>
    </ModalLayout>);
}
