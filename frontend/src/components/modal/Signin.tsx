"use client";

import { useModal } from "@/context/ModalContext";
import ModalLayout from "@/components/modal/Layout";
import React, {useEffect, useRef, useState} from "react";
import Input from "@/components/Input";
import {useAuth} from "@/context/AuthContext";
import {useNotification} from "@/context/NotificationContext";
import {Button, SmallButton} from "@/components/Buttons";
import {useTranslations} from "next-intl";
import {OauthServices} from "@/components/OAuth";
import {useApiMutation} from "@/hooks/useApiMutation";
import {postLogin} from "@/api/auth";

export default function Signin() {
    const {openModal, activeModal, closeModal,} = useModal();
    const {login} = useAuth();
    const {addNotification} = useNotification();
    const [password, setPassword] = useState("");
    const [loginInput, setLoginInput] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const t = useTranslations("auth.signin");
    const tSuccess = useTranslations("notifications.success");
    const {execute} = useApiMutation(setErrors);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
    }, [activeModal.type]);

    if (activeModal.type !== "signin")
        return null;

    const handleLogin = async () => {
        const makePostRequest = async () => {
            return await execute((locale) => postLogin(locale, loginInput, password));
        };

        makePostRequest().then((data) => {
            if (data) {
                login(data.data.user, data.data.access_token);
                closeModal();
                addNotification(tSuccess("login"), "success");
            }
        })
    };

    return (<ModalLayout onClose={closeModal} title={t("title")}>
        <Input id="login-signin" value={loginInput} onChange={setLoginInput} type="text" placeholder={t("login")} errorMessage={errors["login"]} ref={inputRef}></Input>
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
    </ModalLayout>);
}
