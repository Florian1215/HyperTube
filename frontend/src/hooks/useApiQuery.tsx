import {useQuery} from "@tanstack/react-query";
import {useLocale, useTranslations} from "next-intl";
import React, {useCallback} from "react";
import {ApiError} from "@/api/errors";
import {useNotification} from "@/context/NotificationContext";
import {useModal} from "@/context/ModalContext";

export function useApiQuery<T>(key: string[], fn: (locale: string) => Promise<T>, enabled = true) {
    const locale = useLocale();
    const queryKey = [...key, locale];

    return useQuery({
        queryKey: queryKey,
        queryFn: () => fn(locale),
        enabled: enabled && !!locale,
        retry: false
    });
}

export function useHandleError() {
    const {openModal} = useModal();
    const {addNotification} = useNotification();
    const tError = useTranslations("notifications.error");

    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    return useCallback((error: ApiError, translation: "Film" | "User") => {
        if (error instanceof ApiError) {
            if (error.status === 401) {
                openModal({type: "signin"});
                return (<p className="small-text hover:underline hover:cursor-pointer" onClick={() =>
                    openModal({type: "signin"})
                }>{tError("loginRequired")}</p>);
            } else if (error.status === 404)
                return (<p className="small-text">{tError("notFound" + translation)}</p>);
        } else
            addNotification(tError("network"), "error");
        return null;
    }, [tError]);
}
