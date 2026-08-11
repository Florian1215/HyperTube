"use client";

import useModal from "@/contexts/ModalContext";
import {useTranslations} from "next-intl";
import React, {useState} from "react";
import ModalLayout from "@/components/layout/ModalLayout";
import {iPeople} from "@/types/movie";
import Link from "next/link";
import Image from "next/image";
import SmallText from "@/components/ui/SmallText";


export default function CreditsModal() {
    const {activeModal, closeModal} = useModal();
    const t = useTranslations("movie.credits");
    const [activeTab, setActiveTab] = useState<number>(0);

    const switchTab = (tabIdx: number) => {
        if (activeTab !== tabIdx)
            setActiveTab(tabIdx);
    }

    if (activeModal.type !== "credits" || activeModal.cast === undefined || activeModal.crew === undefined)
        return null;

    return (<ModalLayout title={t("title")} onCloseAction={closeModal}>
        <div className="flex h-12 sm:h-16 overflow-x-auto">
            <div className="border-b border-r w-12" />
            {["cast", "crew"].map((tab, index) => (<button
                key={index}
                className={"custom-condensed text-2xl sm:text-3xl md:text-4xl tracking-wide sm:tracking-normal border-t border-r px-3 sm:px-12 xl:px-16 border-b text-nowrap" + (activeTab === index ? " border-b-white" : "")}
                onClick={() => switchTab(index)}>{t(tab)}</button>))}
            <div className="border-b w-full" />
        </div>
        <div className="mx-auto p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-100 overflow-x-auto">
            {[activeModal.cast, activeModal.crew][activeTab].map((item, index) => <People key={index} p={item} closeModal={closeModal}/>)}
        </div>
    </ModalLayout>)
}

function People({p, closeModal}: {p: iPeople, closeModal: () => void}) {
    return (<Link href={`/people/${p.id}`} className="w-full" onClick={closeModal}>
        <div className="flex gap-2 items-center">
            <div className="relative rounded-full border size-20">
                <div className="custom-noise opacity-25"/>
                {
                    p.picture ?
                        <Image className="rounded-full aspect-square object-cover" src={p.picture} alt={p.name} height={200} width={200}/> :
                        <div className="size-full bg-gray rounded-full"/>
                }
            </div>
            <div className="flex flex-col items-start">
                <p className="hover:underline">{p.name}</p>
                {p.job && <SmallText>{p.job}</SmallText>}
                {p.character && <SmallText>{p.character}</SmallText>}
            </div>
        </div>
    </Link>);
}
