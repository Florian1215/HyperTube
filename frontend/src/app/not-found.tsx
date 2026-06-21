"use client";

import {usePathname, useRouter} from "@/i18n/navigation";
import {useEffect} from "react";
import {useTranslations} from "next-intl";
import useNotification from "@/contexts/NotificationContext";

export default function NotFoundPage() {
    const router = useRouter();
    const {addNotification} = useNotification();
    const pathname = usePathname();
    const tError = useTranslations("notifications.error");

    useEffect(() => {
        addNotification(tError("notFound", {path: pathname}), "error");
        setTimeout(() => {
            router.replace("/");
        }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);
    return (<h1 className="text-center">404 - Not Found</h1>);
}
