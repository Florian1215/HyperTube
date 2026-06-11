import {useQuery} from "@tanstack/react-query";
import {useLocale, useTranslations} from "next-intl";
import React, {useCallback} from "react";
import {ApiError} from "@/api/errors";
import {useNotification} from "@/context/NotificationContext";
import {useModal} from "@/context/ModalContext";
import {useAuth} from "@/context/AuthContext";
import {Link, usePathname, useRouter} from "@/i18n/navigation";

export function useApiQuery<T>(key: string[], fn: (locale: string, signal?: AbortSignal) => Promise<T>, enabled = true) {
    const locale = useLocale();
    const queryKey = [...key, locale];

    return useQuery({
        queryKey: queryKey,
        queryFn: ({signal}) => fn(locale, signal),
        enabled: enabled && !!locale,
        retry: false
    });
}

export function useHandleError() {
    const {openModal} = useModal();
    const {addNotification} = useNotification();
    const tError = useTranslations("notifications.error");
    const {setCallbackUrl} = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    return useCallback((error: ApiError, translation: "Film" | "User") => {
        if (error instanceof ApiError) {
            if (error.status === 401) {
                openModal({type: "signin"});
                setCallbackUrl(pathname);
                router.push("/");
                return (<button className="w-full"><p className="small-text hover:underline" onClick={() =>
                    openModal({type: "signin"})
                }>{tError("loginRequired")}</p></button>);
            } else if (error.status === 404)
                return (<p className="small-text">{tError("notFound" + translation)}</p>);
        } else
            addNotification(tError("network"), "error");
        return (<Link href={"/"}><p className="text-center italic text-red">{tError("unknown")}</p></Link>);
    }, [pathname, tError]);
}
