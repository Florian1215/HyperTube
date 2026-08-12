"use client";

import React from "react";
import {useTranslations} from "next-intl";
import useModal from "@/contexts/ModalContext";
import AuthModalLayout from "@/components/layout/AuthModalLayout";

export default function SigninModal() {
    const {activeModal} = useModal();
    const t = useTranslations("auth.signin");

    if (activeModal.type !== "signin")
        return null;

    return (<AuthModalLayout type="signin" t={t} activeModal={activeModal}/>)
}
