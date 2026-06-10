"use client";

import {useRouter} from "next/navigation";
import {ApiError} from "@/api/errors";
import {useModal} from "@/context/ModalContext";
import {useNotification} from "@/context/NotificationContext";
import {useLocale, useTranslations} from "next-intl";
import {tLocale} from "@/i18n/request";

export function useApiMutation(setErrorsAction?: (errors: Record<string, string>) => void, setFocusedIndex?: (idx: number) => void, formType?: string) {
    const router = useRouter();
    const {openModal} = useModal();
    const locale = useLocale() as tLocale;
    const {addNotification} = useNotification();
    const tError = useTranslations("notifications.error");

    async function execute<T>(callback: (locale: string) => Promise<T>): Promise<T | null> {
        try {
            return await callback(locale);
        } catch (error) {
            if (error instanceof ApiError) {
                if ((error.status === 400 || error.status === 409) && error.data.error.fields && setErrorsAction && formType) {
                    const newErrors: Record<string, string> = {};
                    let setNewFocus = false;

                    Object.entries(error.data.error.fields).map(([key, value], idx)=> {
                        newErrors[key + "-" + formType] = value.message;
                        if (!setNewFocus && setFocusedIndex) {
                            setNewFocus = true;
                            setFocusedIndex(idx);
                        }
                    });
                    setErrorsAction(newErrors);
                    return null;
                } else if (error.status === 401 && !setErrorsAction) {
                    openModal({type: "signin"});
                    return null;
                } else if (error.status === 401 && setErrorsAction) {
                    setErrorsAction({"login-signin": error.message});
                    return null;
                } else if (error.status === 404) {
                    router.push("/404");
                    return null;
                } else
                    addNotification(`${error.status} - ${error.message}`, "error");
            } else
                addNotification(tError("network"), "error");
            return null;
        }
    }
    return {execute};
}
