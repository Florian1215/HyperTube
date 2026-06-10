"use client";

import {useModal} from "@/context/ModalContext";
import {AuthModalLayout} from "@/components/modal/Layout";
import React from "react";
import {useTranslations} from "next-intl";

export default function Signin() {
    const {openModal, activeModal, closeModal,} = useModal();
    const t = useTranslations("auth.signin");

    if (activeModal.type !== "signin")
        return null;

    const handleForgotPassword = () => {
        closeModal();
        openModal({type: "forgot-password"});
    };

    return (<AuthModalLayout type={"signin"} t={t} handleForgotPassword={handleForgotPassword} />)
}
