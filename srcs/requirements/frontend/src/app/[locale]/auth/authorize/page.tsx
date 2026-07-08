"use client";

import React from "react";
import {useTranslations} from "next-intl";
import useNotification from "@/contexts/NotificationContext";
import SmallText from "@/components/ui/SmallText";
import Button from "@/components/ui/Button/Button";
import SecondaryButton from "@/components/ui/Button/SecondaryButton";
import useAuth from "@/contexts/AuthContext";
import useModal from "@/contexts/ModalContext";

export default function OAuthCallbackPage() {
    const t = useTranslations("auth.oauth");
    const {addNotification} = useNotification();
    const tError = useTranslations("notifications.error");
    const {user} = useAuth();
    const {openModal} = useModal();

    if (!user)
        openModal({type: "signin", noClose: true});

    return (<div>
        <p>
            HyperTube souhaite accéder à :

            <br/>
            ✓ Votre nom
            <br/>
            ✓ Votre adresse email
            <br/>
            ✓ Votre photo de profil
        </p>

        <Button>Autoriser</Button>
        <SecondaryButton>Refuser</SecondaryButton>
        <SmallText>{t("loadingAuth")}</SmallText>
    </div>);
}
