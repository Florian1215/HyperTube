"use client";

import { useModal } from "@/context/ModalContext";
import {AuthModalLayout} from "@/components/modal/Layout";
import React from "react";
import {useAuth} from "@/context/AuthContext";
import {useTranslations} from "next-intl";
import {useNotification} from "@/context/NotificationContext";
import {tResponse} from "@/api/client";
import {iUserToken} from "@/types/user";

export default function Register() {
    const {activeModal, closeModal} = useModal();
    const {login} = useAuth();
    const t = useTranslations("auth.register");
    const tSuccess = useTranslations("notifications.success");
    const {addNotification} = useNotification();

    if (activeModal.type !== "register")
        return null;

    const handleRegister = (data: tResponse<iUserToken>) => {
        login(data.data.user, data.data.access_token);
        closeModal();
        addNotification(tSuccess("accountCreatedSuccess"), "success");
    };
    return (<AuthModalLayout type={"register"} t={t} handleRequest={handleRegister}/>)
}
