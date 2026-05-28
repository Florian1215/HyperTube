"use client";

import React, {useEffect, useRef, useState} from "react";
import {useRouter} from "@/i18n/navigation";
import {useAuth} from "@/context/AuthContext";
import {useNotification} from "@/context/NotificationContext";
import {parseOAuthCallbackHash} from "@/services/auth";

export default function OAuthCallbackPage() {
    const router = useRouter();
    const {login} = useAuth();
    const {addNotification} = useNotification();
    const handled = useRef(false);
    const [message, setMessage] = useState("Completing sign-in...");

    useEffect(() => {
        if (handled.current)
            return;
        handled.current = true;

        const query = new URLSearchParams(window.location.search);
        const error = query.get("error");
        if (error) {
            const description = query.get("error_description") ?? error;
            setMessage(description);
            addNotification(description, "error");
            const timeout = window.setTimeout(() => router.replace("/"), 2500);
            return () => window.clearTimeout(timeout);
        }

        try {
            const data = parseOAuthCallbackHash(window.location.hash);
            login(data.user, data.access_token);
            addNotification("Signed in successfully", "success");
            window.history.replaceState(null, "", window.location.pathname);
            router.replace("/");
        } catch (err) {
            console.error(err);
            const fallbackMessage = "OAuth sign-in could not be completed";
            setMessage(fallbackMessage);
            addNotification(fallbackMessage, "error");
            const timeout = window.setTimeout(() => router.replace("/"), 2500);
            return () => window.clearTimeout(timeout);
        }
    }, [addNotification, login, router]);

    return (
        <main className="min-h-[60vh] flex items-center justify-center px-4">
            <p className="small-text">{message}</p>
        </main>
    );
}
