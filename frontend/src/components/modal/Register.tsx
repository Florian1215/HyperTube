"use client";

import { useModal } from "@/context/ModalContext";
import ModalLayout from "@/components/modal/Layout";
import React, {useState} from "react";
import Input from "@/components/Input";
import {iUser} from "@/types/user";
import {useAuth} from "@/context/AuthContext";
import {Button, SmallButton} from "@/components/Buttons";
import {useTranslations} from "next-intl";
import {postRegister} from "@/services/auth";
import {OauthServices} from "@/components/OAuth";
import {tNotificationType, useNotification} from "@/context/NotificationContext";

export default function Register() {
    const {openModal, activeModal, closeModal} = useModal();
    const {login} = useAuth();
    const [email, setEmail] = useState("");
    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const t = useTranslations("auth.register");
    const tSuccess = useTranslations("notifications.success");
    const {addNotification} = useNotification();

    if (activeModal.type !== "register")
        return null;

    return (
        <ModalLayout onClose={closeModal} title={t("title")}>
            <Input id="email-register" value={email} onChange={setEmail} type="email" placeholder={t("email")}></Input>

            <div className="flex gap-2">
                <Input id="firstname-register" value={firstname} onChange={setFirstname} type="firstname" placeholder={t("firstname")}></Input>
                <Input id="lastname-register" value={lastname} onChange={setLastname} type="lastname" placeholder={t("lastname")}></Input>
            </div>

            <Input id="username-register" value={username} onChange={setUsername} type="username" placeholder={t("username")} className={"max-w-2/3"}></Input>
            <Input id="password-register" value={password} onChange={setPassword} type="password" placeholder={t("password")} className={"max-w-2/3"}></Input>

            <Button className="h-8 mt-2" onClick={() =>
                handleRegister(login, addNotification, username, email, firstname, lastname, password, closeModal, tSuccess("accountCreatedSuccess"))
            }>{t("submit")}</Button>

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

async function handleRegister(login: (user: iUser, token: string) => void, addNotification: (message: string, type?: tNotificationType) => void, username: string, email: string, firstname: string, lastname: string, password: string, closeModal: () => void, successMessage: string) {
    try {
        const data = await postRegister(email, username, firstname, lastname, password);
        login(data.data.user, data.data.access_token);
        closeModal();
        addNotification(successMessage, "success");
    } catch (error) { // todo handle
        console.error(error);
    }
}
