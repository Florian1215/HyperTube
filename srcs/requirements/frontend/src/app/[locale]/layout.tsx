import Navbar from "@/components/layout/nav/Navbar";
import "./fonts.css";
import "./globals.css";
import React from "react";
import {NextIntlClientProvider} from "next-intl";
import {getLocale, getMessages} from "next-intl/server";
import Providers from "@/app/providers";
import Colors from "@/components/Colors";
import {AuthProvider} from "@/contexts/AuthContext";
import {NotificationProvider} from "@/contexts/NotificationContext";
import {ModalProvider} from "@/contexts/ModalContext";
import NotificationList from "@/components/ui/Notification/NotificationList";
import SigninModal from "@/components/features/auth/SigninModal";
import RegisterModal from "@/components/features/auth/RegisterModal";
import GenreModal from "@/components/features/genre/GenreModal";
import FilterGenreModal from "@/components/features/genre/FilterGenreModal";
import Page404ErrorHandler from "@/contexts/Page404ErrorHandler";
import SelectTorrentModal from "@/components/features/movie/SelectTorrentModal";
import DeleteConfirmationModal from "@/components/ui/DeleteConfirmationModal";
import CreditsModal from "@/components/features/movie/CreditsModal";

export default async function RootLayout({children}: {children: React.ReactNode}) {
    const messages = await getMessages();
    const currentLocale = await getLocale();

    return (<html lang={currentLocale}>
    <body>

    <div className="fixed inset-0 -z-10">
        <Colors heigth="h-full"/>
    </div>

    <div className="bg-white min-h-screen">
        <NextIntlClientProvider locale={currentLocale} messages={messages}>
            <Providers>
                <AuthProvider>
                    <NotificationProvider>
                        <ModalProvider>
                            <Page404ErrorHandler/>
                            <NotificationList/>

                            <SigninModal/>
                            <RegisterModal/>
                            <GenreModal/>
                            <FilterGenreModal/>
                            <DeleteConfirmationModal/>
                            <CreditsModal/>
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
