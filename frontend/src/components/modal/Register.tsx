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
import {useSetterError} from "@/hooks/useSetterError";
import {handleKeyDown} from "@/context/utils";

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
    const newSetterError = useSetterError(setErrors, setDisableBtn);
    const formRef = useRef<HTMLFormElement>(null);
    const fieldRefs = useRef<HTMLInputElement[]>([]);
    const [focusedIndex, setFocusedIndex] = useState(0);

    useEffect(() => {
        fieldRefs.current[focusedIndex]?.focus();
    }, [focusedIndex]);

    if (activeModal.type !== "register")
        return null;

    const handleRegister = async () => {
        const makePostRequest = async () => {
            return await execute((locale) => postRegister(locale, email.trim(), username.trim(), firstname.trim(), lastname.trim(), password));
        };

        if (disableBtn)
            return ;
        else if (email.trim().length === 0 || firstname.trim().length === 0 || lastname.trim().length === 0 || username.trim().length === 0 || password.trim().length === 0) {
            const requiredErrors: Record<string, string> = {};
            let focusIsSet = false;

            const obj = [["email", email], ["firstname", firstname], ["lastname", lastname], ["username", username], ["password", password]];
            obj.map((items: string[], index: number) => {
                if (items[1].trim().length === 0) {
                    requiredErrors[items[0]] = tError("requiredField");
                    if (!focusIsSet) {
                        focusIsSet = true;
                        setFocusedIndex(index);
                    }
                }
            })
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

    const RegisterInput = (type: string, value: string, setter: (newValue:string) => void, idx: number, className?: string) =>
        <Input id={type + "-register"} type={type === "password" ? "password" : "text"} placeholder={t(type)} value={value} onChange={setter} className={className}
               requestErrorMessage={errors[type]} setErrorsMessage={newSetterError} ref={(el: HTMLInputElement) => {fieldRefs.current[idx] = el;}}
               onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, idx, fieldRefs, handleRegister, setFocusedIndex, errors)}></Input>;

    return (<ModalLayout onClose={closeModal} title={t("title")}>
        <form ref={formRef} onSubmit={handleRegister}>
            {RegisterInput("email", email, setEmail, 0)}

            <div className="flex gap-2">
                {RegisterInput("firstname", firstname, setFirstname, 1)}
                {RegisterInput("lastname", lastname, setLastname, 2)}
            </div>

            {RegisterInput("username", username, setUsername, 3, "max-w-2/3")}
            {RegisterInput("password", password, setPassword, 4, "max-w-2/3")}

            <Button className="h-8 mt-2" onClick={handleRegister} disabled={disableBtn}>{t("submit")}</Button>
        </form>

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
