"use client";

import {useLocale, useTranslations} from "next-intl";
import {tLocale} from "@/i18n/request";
import useNotification from "@/contexts/NotificationContext";
import useModal from "@/contexts/ModalContext";
import {fieldType} from "@/components/ui/Form";
import useAuth from "@/contexts/AuthContext";
import {usePathname} from "@/i18n/navigation";
import {ApiError} from "@/services/apiClient";

export default function useApiMutation(setErrorsAction?: (errors: Record<string, string>) => void, setFocusedIndex?: (idx: number) => void, formType?: string, fields?: fieldType[]) {
    const {setCallbackUrl, logout} = useAuth();
    const {openModal} = useModal();
    const locale = useLocale() as tLocale;
    const {addNotification} = useNotification();
    const tError = useTranslations("notifications.error");
    const tValidationError = useTranslations("validationErrors");
    const pathname = usePathname();

    async function execute<T>(callback: (locale: string) => Promise<T>): Promise<T | null> {
        try {
            return await callback(locale);
        } catch (error) {
            if (error instanceof ApiError) {
                const newErrors: Record<string, string> = {};
                let setNewFocus = false;

                if (formType && fields !== undefined) {
                    fields.forEach((field, idx)=> {
                        if (error.data && error.data[field]) {
                            newErrors[field + "-" + formType] = error.data[field][0];
                            if (!setNewFocus && setFocusedIndex) {
                                setNewFocus = true;
                                setFocusedIndex(idx);
                            }
                        }
                    });
                }
                if (setErrorsAction && Object.keys(newErrors).length > 0) {
                    setErrorsAction(newErrors);
                    return null;
                }
                else if (error.status === 401 && setErrorsAction && setFocusedIndex && formType === "signin") {
                    setErrorsAction({"username-signin": tValidationError("invalidCredentials")});
                    setFocusedIndex(0);
                    return null;
                } else if (error.status === 401) {
                    setCallbackUrl(pathname);
                    openModal({type: "signin"});
                    logout();
                    return null;
                } else
                    addNotification(error.message, "error");
            } else
                addNotification(tError("network"), "error");
            return null;
        }
    }
    return {execute};
}
