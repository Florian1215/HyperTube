"use client";

import {useEffect} from "react";
import useAuth from "@/contexts/AuthContext";
import useModal from "@/contexts/ModalContext";
import {usePathname} from "@/i18n/navigation";
import {SESSION_EXPIRED_EVENT} from "@/services/apiClient";

export default function SessionExpiredHandler() {
    const {logout, setCallbackUrl} = useAuth();
    const {openModal} = useModal();
    const pathname = usePathname();

    useEffect(() => {
        const handleSessionExpired = () => {
            setCallbackUrl(pathname);
            openModal({type: "signin"});
            logout();
        };

        window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
        return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    return null;
}
