"use client";

import React from "react";
import {useTranslations} from "next-intl";
import useModal from "@/contexts/ModalContext";
import ModalLayout from "@/components/layout/ModalLayout";
import Button from "@/components/ui/Button/Button";
import SecondaryButton from "@/components/ui/Button/SecondaryButton";

export function DeleteCommentModal() {
    const {activeModal, closeModal,} = useModal();
    const t = useTranslations("modal.deleteComment");

    if (activeModal.type !== "delete-comment" || activeModal.commentId === undefined || activeModal.deleteComment === undefined)
        return null;

    return (<ModalLayout onCloseAction={closeModal} title={t("title")}>
        <div className="flex gap-2 w-full">
            <Button
                className="w-full"
                onClick={() => {
                    if (activeModal.deleteComment && activeModal.commentId)
                        activeModal.deleteComment(activeModal.commentId);
                    closeModal();
                }}>{t("confirm")}</Button>
            <SecondaryButton
                className="w-full"
                onClick={closeModal}>{t("cancel")}</SecondaryButton>
        </div>
    </ModalLayout>);
}
