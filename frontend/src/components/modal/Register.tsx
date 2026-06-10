"use client";

import { useModal } from "@/context/ModalContext";
import {AuthModalLayout} from "@/components/modal/Layout";
import React from "react";
import {useAuth} from "@/context/AuthContext";
import {useTranslations} from "next-intl";
import {useNotification} from "@/context/NotificationContext";
import {tResponse} from "@/api/client";
import {iUserToken} from "@/types/user";
import {useRouter} from "@/i18n/navigation";

export default function Register() {
    const {activeModal, closeModal} = useModal();
    const router = useRouter();
    const {login, callbackUrl, setCallbackUrl} = useAuth();
    const t = useTranslations("auth.register");
    const tSuccess = useTranslations("notifications.success");
    const {addNotification} = useNotification();

    if (activeModal.type !== "register")
        return null;

    const handleRegister = (data: tResponse<iUserToken>) => {
        login(data.data.user, data.data.access_token);
        closeModal();
        if (callbackUrl) {
            router.push(callbackUrl);
            setCallbackUrl(null);
        }
        addNotification(tSuccess("accountCreatedSuccess"), "success");
    };
    return (<AuthModalLayout type={"register"} t={t} handleRequest={handleRegister}/>)
}
