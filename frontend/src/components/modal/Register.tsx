"use client";

import {useModal} from "@/context/ModalContext";
import {AuthModalLayout} from "@/components/modal/Layout";
import React from "react";
import {useTranslations} from "next-intl";

export default function Register() {
    const {activeModal} = useModal();
    const t = useTranslations("auth.register");

    if (activeModal.type !== "register")
        return null;

    return (<AuthModalLayout type={"register"} t={t} />)
}
