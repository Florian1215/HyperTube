"use client";

import {useModal} from "@/context/ModalContext";
import ModalLayout from "@/components/modal/Layout";
import React from "react";
import {useNotification} from "@/context/NotificationContext";
import {useTranslations} from "next-intl";
import Form from "@/components/Form";
import {postResetPassword} from "@/api/auth";
import {useAuth} from "@/context/AuthContext";

export default function ForgotPassword() {
    const {setCallbackUrl} = useAuth();
    const {activeModal, closeModal} = useModal();
    const {addNotification} = useNotification();
    const t = useTranslations("auth.forgotPassword");
    const tSuccess = useTranslations("notifications.success");

    if (activeModal.type !== "forgot-password")
        return null;

    const handleResetPassword = () => {
        setCallbackUrl(null);
        closeModal();
        addNotification(tSuccess("emailResetPassword"), "warning");
    }

    return (<ModalLayout onClose={() => {closeModal(); setCallbackUrl(null);}} title={t("title")}>
        <Form formType={"reset-password"} request={postResetPassword} handleRequest={handleResetPassword} fields={["email"]} t={t} />
    </ModalLayout>);
}
