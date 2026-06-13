import {useTranslations} from "next-intl";
import {useCallback} from "react";
import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {ApiError} from "@/services/ApiError";
import useModal from "@/contexts/ModalContext";
import useNotification from "@/contexts/NotificationContext";
import useAuth from "@/contexts/AuthContext";

export default function useHandleError() {
    const {openModal} = useModal();
    const {addNotification} = useNotification();
    const tError = useTranslations("notifications.error");
    const {setCallbackUrl} = useAuth();
    const pathname = usePathname();
    const router = useRouter();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, tError]);
}
