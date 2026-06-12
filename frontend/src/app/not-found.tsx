"use client";

import {usePathname, useRouter} from "@/i18n/navigation";
import {useEffect} from "react";
import {useNotification} from "@/context/NotificationContext";
import {useTranslations} from "next-intl";

export default function NotFoundPage() {
    const router = useRouter();
    const {addNotification} = useNotification();
    const pathname = usePathname();
    const tError = useTranslations("notifications.error");

    useEffect(() => {
        addNotification(tError("notFound").replace("{path}", pathname), "error");
        setTimeout(() => {
            router.replace("/");
        }, 0);
    }, [pathname]);
    return (<h1 className="text-center">404 - Not Found</h1>);
}
