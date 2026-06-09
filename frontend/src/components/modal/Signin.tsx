"use client";

import { useModal } from "@/context/ModalContext";
import ModalLayout from "@/components/modal/Layout";
import React from "react";
import {useAuth} from "@/context/AuthContext";
import {useNotification} from "@/context/NotificationContext";
import {SmallButton} from "@/components/Buttons";
import {useTranslations} from "next-intl";
import {OauthServices} from "@/components/OAuth";
import {tResponse} from "@/api/client";
import {iUserToken} from "@/types/user";
import Form from "@/components/Form";
import {postLogin} from "@/api/auth";

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

    return (<ModalLayout onClose={closeModal} title={t("title")}>
        <Form formType={"signin"} request={postLogin} handleRequest={handleLogin} t={t}
              fields={["login", "password"]} handleForgotPassword={handleForgotPassword} />
        <div className="flex gap-2 mt-5">
            <span className="text-sm">{t("noAccount")}</span>
            <SmallButton onClick={() => {
                closeModal(); openModal({type: "register"});
            }}>{t("register")}</SmallButton>
        </div>
        <OauthServices />
    </ModalLayout>);
}
