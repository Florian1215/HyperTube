"use client";

import React, {useEffect} from "react";
import {useAuth} from "@/context/AuthContext";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";

export default function OAuthCallbackPage() {
    const t = useTranslations("auth.oauth");
    const {login} = useAuth();
    const router = useRouter();

    useEffect(() => {
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace("#", ""));
        const token = params.get("access_token");
        const userEncoded = params.get("user");

        if (!token || !userEncoded)
            return;

        const user = JSON.parse(decodeURIComponent(decodeURIComponent(userEncoded)));
        login(user, token);
        router.push("/");
    }, []);

    return (<p className="small-text">{t("loadingAuth")}</p>);
}
