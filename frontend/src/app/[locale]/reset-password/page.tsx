"use client";

import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {useSearchParams} from "next/navigation";
import {useNotification} from "@/context/NotificationContext";
import {useModal} from "@/context/ModalContext";
import {useEffect} from "react";
import {useAuth} from "@/context/AuthContext";

export default function Page() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const {addNotification} = useNotification();
    const router = useRouter();
    const {openModal} = useModal();
    const {user, loading} = useAuth();
    const tError = useTranslations("notifications.error");

    useEffect(() => {
        if (!loading) {
            if (!user) {
                if (token)
                    openModal({type: "set-new-password", token: token});
                else
                    addNotification(tError("missingToken"), "error");
            }
            setTimeout(() => {
                router.replace("/");
            }, 0);
        }
    }, [loading]);
}
