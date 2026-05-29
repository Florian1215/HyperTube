"use client";

import { useModal } from "@/context/ModalContext";
import ModalLayout from "@/components/modal/Layout";
import React, {useState} from "react";
import Input from "@/components/Input";
import {handleErrorRequest, useAuth} from "@/context/AuthContext";
import {useNotification} from "@/context/NotificationContext";
import {Button, SmallButton} from "@/components/Buttons";
import {useTranslations} from "next-intl";
import {postLogin} from "@/services/auth";
import {OauthServices} from "@/components/OAuth";
import {tErrorResponse} from "@/services/api";

export default function Signin() {
    const {openModal, activeModal, closeModal,} = useModal();
    const {login} = useAuth();
    const {addNotification} = useNotification();
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const t = useTranslations("auth.signin");
    const tError = useTranslations("notifications.error");
    const tSuccess = useTranslations("notifications.success");

    if (activeModal.type !== "signin")
        return null;

    const handleLogin = async () => {
        try {
            const data = await postLogin(email, password);
            login(data.data.user, data.data.access_token);
            closeModal();
            addNotification(tSuccess("login"), "success");
        } catch (error) {
            handleErrorRequest(error as tErrorResponse, addNotification, setErrors, tError("network"))
        }
    }

    return (
        <ModalLayout onClose={closeModal} title={t("title")}>
            <Input id="email-signin" value={email} onChange={setEmail} type="email" placeholder={t("email")} errorMessage={errors["email"]}></Input>
            <Input id="password-signin" value={password} onChange={setPassword} type="password" placeholder={t("password")} errorMessage={errors["password"]}></Input>
            <div className={"relative mb-4" + (errors["password"] ? " pt-5" : "")}>
                <SmallButton className="absolute bottom-1" onClick={() => {
                    closeModal();
                    openModal({type: "forgot-password"});
                }}>{t("forgotPassword")}</SmallButton>
            </div>
            <Button className="h-8" onClick={handleLogin}>{t("submit")}</Button>
            <div className="flex gap-2 mt-5">
                <span className="text-sm">{t("noAccount")}</span>
                <SmallButton onClick={() => {
                    closeModal();
                    openModal({type: "register"});
                }}>{t("register")}</SmallButton>
            </div>
            <OauthServices />
        </ModalLayout>
    );
}
