import Navbar from "@/components/layout/Navbar";
import "./fonts.css";
import "./globals.css";
import React from "react";
import type {Metadata, Viewport} from "next";
import {NextIntlClientProvider} from "next-intl";
import {getLocale, getMessages} from "next-intl/server";
import Providers from "@/app/providers";
import Colors from "@/components/Colors";
import {AuthProvider} from "@/contexts/AuthContext";
import {NotificationProvider} from "@/contexts/NotificationContext";
import {ModalProvider} from "@/contexts/ModalContext";
import Page404ErrorHandler from "@/contexts/Page404ErrorHandler";
import SessionExpiredHandler from "@/contexts/SessionExpiredHandler";
import DeleteConfirmationModal from "@/components/ui/DeleteConfirmationModal";
import SearchModal from "@/components/layout/SearchModal";
import ScrollToTop from "@/components/layout/ScrollToTop";
import CreditsMediaModal from "@/app/[type]/[id]/CreditsMediaModal";
import WatchedByModal from "@/app/[type]/[id]/WatchedByModal";
import SetFeatureModal from "@/app/[type]/[id]/SetFeatureModal";
import LogMediaModal from "@/components/LogMediaModal";
import SelectTorrentModal from "@/app/[type]/[id]/SelectTorrentModal";
import ViewAllGenreModal from "@/app/search/ViewAllGenreModal";
import FilterGenreModal from "@/app/search/FilterGenreModal";
import AuthModalLayout from "@/components/layout/AuthModalLayout";
import NotificationList from "@/components/ui/Notifications";

export const metadata: Metadata = {
    icons: {
        icon: [
            {url: "/favicon.ico", sizes: "32x32"},
            {url: "/favicon-96.png", sizes: "96x96", type: "image/png"},
        ],
        apple: {url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png"},
    },
    manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
    themeColor: [
        {media: "(prefers-color-scheme: light)", color: "#FFFFFF"},
        {media: "(prefers-color-scheme: dark)", color: "#191919"},
    ],
};

const ACCENT_COLORS =["yellow", "pink", "green", "purple", "blue", "red"];

function getRandomAccent() {
    return ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)];
}

export default async function RootLayout({children}: {children: React.ReactNode}) {
    const messages = await getMessages();
    const currentLocale = await getLocale();
    const accent = getRandomAccent();

    return (<html lang={currentLocale} data-accent={accent}>
    <body>

    <div className="fixed inset-0 -z-10">
        <Colors heigth="h-full"/>
    </div>

    <div className="bg-dwhite min-h-screen">
        <NextIntlClientProvider locale={currentLocale} messages={messages}>
            <Providers>
                <AuthProvider>
                    <NotificationProvider>
                        <ModalProvider>
                            <Page404ErrorHandler/>
                            <SessionExpiredHandler/>
                            <ScrollToTop/>
                            <NotificationList/>

                            <SearchModal/>
                            <AuthModalLayout type="signin"/>
                            <AuthModalLayout type="register"/>
                            <ViewAllGenreModal/>
                            <FilterGenreModal/>
                            <DeleteConfirmationModal/>
                            <SetFeatureModal/>
                            <LogMediaModal/>
                            <CreditsMediaModal/>
                            <WatchedByModal/>
                            <SelectTorrentModal/>

                            <Navbar/>

                            {children}
                        </ModalProvider>
                    </NotificationProvider>
                </AuthProvider>
            </Providers>
        </NextIntlClientProvider>
    </div>

    </body>
    </html>);
}
