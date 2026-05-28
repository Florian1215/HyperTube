"use client";

import {useEffect, useRef} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {useAuth} from "@/context/AuthContext";
import {useNotification} from "@/context/NotificationContext";
import {BackendUser, normalizeAuthPayload} from "@/services/auth";
import {iUserToken} from "@/types/user";

export default function AuthCallbackPage() {
    const router = useRouter();
    const {login} = useAuth();
    const {addNotification} = useNotification();
    const tSuccess = useTranslations("notifications.success");
    const tError = useTranslations("notifications.error");
    const handled = useRef(false);

    useEffect(() => {
        if (handled.current)
            return;
        handled.current = true;

        if (!window.location.search && !window.location.hash) {
            router.replace("/");
            return;
        }

        try {
            const errorParams = new URLSearchParams(window.location.search);
            if (errorParams.has("error")) {
                throw new Error(errorParams.get("error_description") ?? errorParams.get("error") ?? "OAuth failed");
            }

            const fragment = window.location.hash.startsWith("#")
                ? window.location.hash.slice(1)
                : window.location.hash;
            const authParams = new URLSearchParams(fragment);
            const accessToken = authParams.get("access_token");
            const userParam = authParams.get("user");

            if (!accessToken || !userParam) {
                throw new Error("Missing OAuth response data");
            }

            const auth = normalizeAuthPayload({
                access_token: accessToken,
                token_type: "Bearer",
                expires_in: Number(authParams.get("expires_in") ?? 0) as iUserToken["expires_in"],
                user: parseOAuthUser(userParam),
            });

            login(auth.user, auth.access_token);
            addNotification(tSuccess("login"), "success");
        } catch (error) {
            console.error(error);
            addNotification(tError("unknown"), "error");
        } finally {
            window.history.replaceState(null, "", window.location.pathname);
            router.replace("/");
        }
    }, [addNotification, login, router, tError, tSuccess]);

    return null;
}

function parseOAuthUser(userParam: string): BackendUser {
    try {
        return JSON.parse(userParam) as BackendUser;
    } catch {
        return JSON.parse(decodeURIComponent(userParam)) as BackendUser;
    }
}
