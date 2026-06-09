"use client";

import { useModal } from "@/context/ModalContext";
import ModalLayout from "@/components/modal/Layout";
import React from "react";
import {useAuth} from "@/context/AuthContext";
import {SmallButton} from "@/components/Buttons";
import {useTranslations} from "next-intl";
import {OauthServices} from "@/components/OAuth";
import {useNotification} from "@/context/NotificationContext";
import {postRegister} from "@/api/auth";
import Form from "@/components/Form";
import {tResponse} from "@/api/client";
import {iUserToken} from "@/types/user";

export default function Register() {
    const {openModal, activeModal, closeModal} = useModal();
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

    return (<ModalLayout onClose={closeModal} title={t("title")}>
        <Form formType={"register"} request={postRegister} handleRequest={handleRegister} t={t}
              fields={["email", "first_name", "last_name", "username", "password"]} />
        <div className="flex gap-2 mt-5">
            <span className="text-sm">{t("haveAccount")}</span>
            <SmallButton onClick={() => {
                closeModal();
                openModal({type: "signin"});
            }}>{t("signIn")}</SmallButton>
        </div>
        <OauthServices />
    </ModalLayout>);
}
