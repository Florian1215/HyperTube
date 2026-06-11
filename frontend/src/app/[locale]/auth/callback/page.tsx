"use client";

import React, {useEffect} from "react";
import {useAuth} from "@/context/AuthContext";
import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {useNotification} from "@/context/NotificationContext";

export default function OAuthCallbackPage() {
    const t = useTranslations("auth.oauth");
    const {login} = useAuth();
    const router = useRouter();
    const {addNotification} = useNotification();
    const tError = useTranslations("notifications.error");

    useEffect(() => {
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace("#", ""));
        const token = params.get("access_token");
        const userEncoded = params.get("user");
        const redirectParam = params.get("redirect");
        let redirect = "/";

        try {
            if (!userEncoded || !token)
                throw new Error("Missing token");
            const user = JSON.parse(decodeURIComponent(decodeURIComponent(userEncoded)));
            login(user, token);
            if (redirectParam)
                redirect = decodeURIComponent(redirectParam);
        } catch {
            addNotification(tError("invalidQueryParameter"), "error");
        }
        router.push(redirect);
    }, []);

    return (<p className="small-text">{t("loadingAuth")}</p>);
}
