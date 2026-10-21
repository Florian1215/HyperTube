"use client";

import React, {Suspense, useEffect, useRef, useState} from "react";
import {useSearchParams} from "next/navigation";
import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import useAuth from "@/contexts/AuthContext";
import useModal from "@/contexts/ModalContext";
import useNotification from "@/contexts/NotificationContext";
import useApiMutation from "@/hooks/useApiMutation";
import {approveTvLogin} from "@/services/auth.service";
import Button from "@/components/ui/Button/Button";
import PageMeta from "@/components/PageMeta";

export default function Page() {
    return (<Suspense><TvLogin/></Suspense>);
}

function TvLogin() {
    const searchParams = useSearchParams();
    const {user, loading, setCallbackUrl} = useAuth();
    const {openModal} = useModal();
    const {addNotification} = useNotification();
    const router = useRouter();
    const {execute} = useApiMutation();
    const t = useTranslations("tv");
    const tSuccess = useTranslations("notifications.success");
    const tMeta = useTranslations("meta");
    const [code, setCode] = useState(searchParams.get("code")?.toUpperCase() ?? "");
    const [pending, setPending] = useState(false);
    const autoOpened = useRef(false);

    const signin = () => {
        setCallbackUrl(`/tv${code ? `?code=${encodeURIComponent(code)}` : ""}`);
        openModal({type: "signin"});
    };

    useEffect(() => {
        if (loading || user || autoOpened.current)
            return;
        autoOpened.current = true;
        signin();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, user]);

    const approve = async () => {
        if (!code.trim())
            return;
        setPending(true);
        const data = await execute((locale) => approveTvLogin(locale, code.trim()));
        setPending(false);
        if (data) {
            addNotification(tSuccess("tvConnected"), "success");
            router.push("/");
        }
    };

    let content;
    if (loading)
        content = null;
    else if (!user)
        content = (<>
            <p className="text-center">{t("signinRequired")}</p>
            <Button onClick={signin} className="w-full">{t("signin")}</Button>
        </>);
    else
        content = (<>
            {!searchParams.get("code") && <input id="tv-code" value={code} maxLength={8} autoComplete="off" spellCheck={false} placeholder={t("code")}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && approve()}
                className="py-2 w-full bg-dwhite text-dblack border-b focus:border-b-2 font-condensed text-4xl tracking-widest text-center uppercase"/>}
            <Button onClick={code.trim() && !pending ? approve : undefined} className="w-full">{t("connect")}</Button>
        </>);

    return (<div className="flex flex-col items-center mt-12 pb-16 px-4">
        <PageMeta title={tMeta("tv")} description={tMeta("tvDescription")}/>
        <h2 className="text-center">{t("title")}</h2>
        <div className="flex flex-col items-center gap-8 w-full max-w-80 mt-12 sm:mt-16">
            {content}
        </div>
    </div>);
}
