"use client";

import {useModal} from "@/context/ModalContext";
import ModalLayout from "@/components/modal/Layout";
import React from "react";
import {useNotification} from "@/context/NotificationContext";
import {useTranslations} from "next-intl";
import Form from "@/components/Form";
import {postSetNewPassword} from "@/api/auth";
import {useAuth} from "@/context/AuthContext";

export default function ResetPassword() {
    const {setCallbackUrl} = useAuth();
    const {activeModal, closeModal} = useModal();
    const {addNotification} = useNotification();
    const t = useTranslations("auth.resetPassword");
    const tSuccess = useTranslations("notifications.success");

    if (activeModal.type !== "set-new-password" || activeModal.token === undefined)
        return null;

    const handleNewPassword = () => {
        closeModal();
        addNotification(tSuccess("newPasswordSet"), "success");
    }

    return (<ModalLayout onClose={() => {closeModal(); setCallbackUrl(null);}} title={t("title")}>
        <Form formType={"set-new-password"} request={postSetNewPassword} handleRequest={handleNewPassword} fields={["new-password", "confirm-new-password"]} t={t} token={activeModal.token} />
    </ModalLayout>);
}
