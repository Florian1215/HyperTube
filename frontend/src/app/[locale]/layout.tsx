import Navbar from "@/components/nav/Navbar";
import {ModalProvider} from "@/context/ModalContext";
import SigninModal from "@/components/modal/Signin";
import RegisterModal from "@/components/modal/Register";
import {GenreModal, FilterGenreModal} from "@/components/modal/Genre";
import "./fonts.css";
import "./globals.css";
import {NotificationProvider} from "@/context/NotificationContext";
import {NotificationList} from "@/components/Notifications";
import React from "react";
import {AuthProvider} from "@/context/AuthContext";
import ForgotPassword from "@/components/modal/ForgotPassword";
import {DeleteCommentModal} from "@/components/modal/DeleteComment";
import {hasLocale, NextIntlClientProvider} from "next-intl";
import {routing} from "@/i18n/request";
import {notFound} from "next/navigation";
import {getLocale, getMessages} from "next-intl/server";
import Providers from "@/app/providers";
import ResetPassword from "@/components/modal/ResetPassword";
import Colors from "@/components/Colors";

export default async function RootLayout({children, params}: {children: React.ReactNode, params: Promise<{locale: string}>}) {
    const {locale} = await params;
    if (!hasLocale(routing.locales, locale)) {
        notFound();
    }

    const messages = await getMessages();
    const currentLocale = await getLocale();

    return (<html lang={currentLocale}>
    <body>

    <div className="fixed inset-0 -z-10">
        <Colors heigth={"h-full"} />
    </div>

    <div className="bg-white min-h-screen">
        <NextIntlClientProvider locale={currentLocale} messages={messages}>
            <Providers>
                <AuthProvider>
                    <NotificationProvider>
                        <ModalProvider>
                            <NotificationList/>

                            <Navbar/>

                            <SigninModal/>
                            <RegisterModal/>
                            <GenreModal/>
                            <FilterGenreModal/>
                            <ForgotPassword/>
                            <ResetPassword/>
                            <DeleteCommentModal/>

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
