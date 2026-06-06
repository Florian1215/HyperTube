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
    const [disableBtn, setDisableBtn] = useState(false);
    const t = useTranslations("auth.register");
    const tSuccess = useTranslations("notifications.success");
    const tError = useTranslations("validationErrors");
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

    const newSetterError = (value: Record<string, string>) => {
        const newErrors = {...errors, ...value};
        setErrors(newErrors);
        if (Object.keys(newErrors).length === 0 || Object.values(newErrors).every((value) => !value))
            setDisableBtn(false);
        else
            setDisableBtn(true);
    };

    const handleRegister = async () => {
        const makePostRequest = async () => {
            return await execute((locale) => postRegister(locale, email.trim(), username.trim(), firstname.trim(), lastname.trim(), password));
        };

        if (email.trim().length === 0 || firstname.trim().length === 0 || lastname.trim().length === 0 || username.trim().length === 0 || password.trim().length === 0) {
            const requiredErrors: Record<string, string> = {};
            if (email.trim().length === 0)
                requiredErrors["login"] = tError("requiredField");
            if (firstname.trim().length === 0)
                requiredErrors["firstname"] = tError("requiredField");
            if (lastname.trim().length === 0)
                requiredErrors["lastname"] = tError("requiredField");
            if (username.trim().length === 0)
                requiredErrors["username"] = tError("requiredField");
            if (password.trim().length === 0)
                requiredErrors["password"] = tError("requiredField");
            setErrors(requiredErrors);
            setDisableBtn(true);
        } else {
            makePostRequest().then((data) => {
                if (data) {
                    login(data.data.user, data.data.access_token);
                    closeModal();
                    addNotification(tSuccess("accountCreatedSuccess"), "success");
                }
            })
        }
    };

    return (<ModalLayout onClose={closeModal} title={t("title")}>
        <Input id="email-register" value={email} onChange={setEmail} type="text" placeholder={t("email")} requestErrorMessage={errors["email"] || errors["login"]} ref={inputRef} setErrorsMessage={newSetterError}></Input>

        <div className="flex gap-2">
            <Input id="firstname-register" value={firstname} onChange={setFirstname} type="text" placeholder={t("firstname")} requestErrorMessage={errors["firstname"]} setErrorsMessage={newSetterError}></Input>
            <Input id="lastname-register" value={lastname} onChange={setLastname} type="text" placeholder={t("lastname")} requestErrorMessage={errors["lastname"]} setErrorsMessage={newSetterError}></Input>
        </div>

        <Input id="username-register" value={username} onChange={setUsername} type="text" placeholder={t("username")} className={"max-w-2/3"} requestErrorMessage={errors["username"] || errors["login"]} setErrorsMessage={newSetterError}></Input>
        <Input id="password-register" value={password} onChange={setPassword} type="password" placeholder={t("password")} className={"max-w-2/3"} requestErrorMessage={errors["password"]} setErrorsMessage={newSetterError}></Input>

        <Button className="h-8 mt-2" onClick={handleRegister} disabled={disableBtn}>{t("submit")}</Button>

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
