"use client";

import { useModal } from "@/context/ModalContext";
import {AuthModalLayout} from "@/components/modal/Layout";
import React from "react";
import {useAuth} from "@/context/AuthContext";
import {useNotification} from "@/context/NotificationContext";
import {useTranslations} from "next-intl";
import {tResponse} from "@/api/client";
import {iUserToken} from "@/types/user";

export default function Signin() {
    const {openModal, activeModal, closeModal,} = useModal();
    const {login} = useAuth();
    const {addNotification} = useNotification();
    const t = useTranslations("auth.signin");
    const tSuccess = useTranslations("notifications.success");

    if (activeModal.type !== "signin")
        return null;

    const handleLogin = (data: tResponse<iUserToken>) => {
        login(data.data.user, data.data.access_token);
        closeModal();
        addNotification(tSuccess("login"), "success");
    };

    const handleForgotPassword = () => {
        closeModal();
        openModal({type: "forgot-password"});
    };

    return (<AuthModalLayout type={"signin"} t={t} handleRequest={handleLogin} handleForgotPassword={handleForgotPassword} />)
}
