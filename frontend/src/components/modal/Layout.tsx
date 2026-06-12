import React, {useEffect} from "react";
import {CloseButton, SmallButton} from "@/components/Buttons";
import Form from "@/components/Form";
import {postLogin, postRegister} from "@/api/auth";
import {useModal} from "@/context/ModalContext";
import {tResponse} from "@/api/client";
import {iUserToken} from "@/types/user";
import {useAuth} from "@/context/AuthContext";
import {useRouter} from "@/i18n/navigation";
import {useNotification} from "@/context/NotificationContext";
import {useTranslations} from "next-intl";

type AuthModalType = "signin" | "register";

export default function ModalLayout({children, onClose, title}: {children: React.ReactNode, onClose: () => void, title: string}) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape")
                onClose();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose]);

    return (<div onClick={onClose} className="fixed inset-0 flex justify-center items-center z-50 bg-black/50">
        <div onClick={(e) => e.stopPropagation()} className="p-6 bg-white custom-shadow-m border min-w-9/10 sm:min-w-90 max-w-9/10 sm:max-w-none">
            <div className="flex flex-col items-start">
                <div className="flex justify-between mb-8 w-full">
                    <span className="uppercase font-wide font-bold font-8xl max-w-70">{title}</span>
                    <CloseButton onClick={onClose} />
                </div>
                {children}
            </div>
        </div>
        <div className="custom-noise-bg" />
    </div>);
}

export function AuthModalLayout({type, t, handleForgotPassword}: {type: AuthModalType, t: (key: string) => string, handleForgotPassword?: () => void}) {
    const {openModal, closeModal} = useModal();
    const isReg = type === "register";
    const otherType: AuthModalType = isReg ? "signin" : "register";
    const {addNotification} = useNotification();
    const router = useRouter();
    const {login, callbackUrl, setCallbackUrl} = useAuth();
    const tSuccess = useTranslations("notifications.success");

    const handleLoginRegister = (data: tResponse<iUserToken>) => {
        login(data.data.user, data.data.access_token);
        closeModal();
        if (callbackUrl) {
            router.push(callbackUrl);
            setCallbackUrl(null);
        }
        addNotification(tSuccess(isReg ? "accountCreatedSuccess" : "login"), "success");
    };

    return (<ModalLayout onClose={() => {setCallbackUrl(null); closeModal();}} title={t("title" + (callbackUrl ? "LoginRequired" : ""))}>
        <Form formType={type} request={isReg ? postRegister : postLogin} handleRequest={handleLoginRegister} t={t} handleForgotPassword={handleForgotPassword}
              fields={isReg ? ["email", "first_name", "last_name", "username", "password"] : ["login", "password"]} />
        <div className="flex gap-2 mt-2">
            <span className="text-sm">{t(isReg ? "haveAccount" : "noAccount")}</span>
            <SmallButton onClick={() => {closeModal(); openModal({type: otherType});}}>{t(otherType)}</SmallButton>
        </div>
    </ModalLayout>);
}