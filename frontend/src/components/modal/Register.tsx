"use client";

import { useModal } from "@/context/ModalContext";
import ModalLayout from "@/components/modal/Layout";
import React, {useEffect, useRef, useState} from "react";
import Input from "@/components/Input";
import {useAuth} from "@/context/AuthContext";
import {Button, SmallButton} from "@/components/Buttons";
import {useTranslations} from "next-intl";
import {OauthServices} from "@/components/OAuth";
import {useNotification} from "@/context/NotificationContext";
import {useApiMutation} from "@/hooks/useApiMutation";
import {postRegister} from "@/api/auth";

export default function Register() {
    const {openModal, activeModal, closeModal} = useModal();
    const {login} = useAuth();
    const [email, setEmail] = useState("");
    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const t = useTranslations("auth.register");
    const tSuccess = useTranslations("notifications.success");
    const {addNotification} = useNotification();
    const {execute} = useApiMutation(setErrors);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
    }, [activeModal.type]);

    if (activeModal.type !== "register")
        return null;

    const handleRegister = async () => {
        const makePostRequest = async () => {
            return await execute((locale) => postRegister(locale, email, username, firstname, lastname, password));
        };

        makePostRequest().then((data) => {
            if (data) {
                login(data.data.user, data.data.access_token);
                closeModal();
                addNotification(tSuccess("accountCreatedSuccess"), "success");
            }
        })
    };

    return (
        <ModalLayout onClose={closeModal} title={t("title")}>
            <Input id="email-register" value={email} onChange={setEmail} type="text" placeholder={t("email")} errorMessage={errors["email"] || errors["login"]} ref={inputRef}></Input>

            <div className="flex gap-2">
                <Input id="firstname-register" value={firstname} onChange={setFirstname} type="text" placeholder={t("firstname")} errorMessage={errors["firstname"]}></Input>
                <Input id="lastname-register" value={lastname} onChange={setLastname} type="text" placeholder={t("lastname")} errorMessage={errors["lastname"]}></Input>
            </div>

            <Input id="username-register" value={username} onChange={setUsername} type="text" placeholder={t("username")} className={"max-w-2/3"} errorMessage={errors["username"] || errors["login"]}></Input>
            <Input id="password-register" value={password} onChange={setPassword} type="password" placeholder={t("password")} className={"max-w-2/3"} errorMessage={errors["password"]}></Input>

            <Button className="h-8 mt-2" onClick={handleRegister}>{t("submit")}</Button>

            <div className="flex gap-2 mt-5">
                <span className="text-sm">{t("haveAccount")}</span>
                <SmallButton onClick={() => {
                    closeModal();
                    openModal({type: "signin"});
                }}>{t("signIn")}</SmallButton>
            </div>
            <OauthServices />
        </ModalLayout>
    );
}
