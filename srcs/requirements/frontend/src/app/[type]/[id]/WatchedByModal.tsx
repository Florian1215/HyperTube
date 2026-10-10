"use client";

import useModal from "@/contexts/ModalContext";
import {useLocale, useTranslations} from "next-intl";
import React from "react";
import ModalLayout from "@/components/layout/ModalLayout";
import {Link} from "@/i18n/navigation";
import ProfilePicture from "@/components/ProfilePicture";
import SmallText from "@/components/ui/SmallText";
import {RewatchIcon} from "@/components/Icons";

export default function WatchedByModal() {
    const {activeModal, closeModal} = useModal();
    const t = useTranslations("media");
    const locale = useLocale();

    if (activeModal.type !== "watched-by" || activeModal.media === undefined)
        return null;

    const views = activeModal.media.watched_by
        .flatMap((user) => user.views.map((date, i) => ({user, date, rewatch: i < user.views.length - 1})))
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

    return (<ModalLayout title={t("watchedBy")} onCloseAction={closeModal}>
        <div className="w-full sm:w-md max-h-100 overflow-y-auto divide-y divide-gray">
            {views.map(({user, date, rewatch}, index) => (<Link key={index} href={`/users/${user.id}`} onClick={closeModal} className="flex items-center gap-4 p-2 group">
                <ProfilePicture size={3} user={user}/>
                <span className="flex-1 min-w-0 truncate text-left font-semibold group-hover:underline">{user.username}</span>
                {rewatch && <span className="mt-0.5"><RewatchIcon color="gray" size={15}/></span>}
                {date && <SmallText>{new Date(date).toLocaleDateString(locale, {day: "numeric", month: "long", year: "numeric"})}</SmallText>}
            </Link>))}
        </div>
    </ModalLayout>);
}
