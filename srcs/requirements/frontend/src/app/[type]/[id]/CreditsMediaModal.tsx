"use client";

import useModal from "@/contexts/ModalContext";
import {useLocale, useTranslations} from "next-intl";
import React, {useState} from "react";
import ModalLayout from "@/components/layout/ModalLayout";
import {iMediaDetails, iPeople} from "@/types/media";
import {iSerieDetails} from "@/types/serie";
import Label from "@/components/ui/Label";
import useFormatDate from "@/utils/formatDate";
import Link from "next/link";
import LoadingImage from "@/components/ui/LoadingImage";
import Tabs from "@/components/ui/Tabs";
import SmallText from "@/components/ui/SmallText";


const TABS = ["info", "cast", "crew"] as const;

export default function CreditsMediaModal() {
    const {activeModal} = useModal();

    if (activeModal.type !== "credits" || activeModal.cast === undefined || activeModal.crew === undefined)
        return null;
    return (<CreditsMedia cast={activeModal.cast} crew={activeModal.crew} media={activeModal.media} initialTab={activeModal.tab ?? "info"}/>);
}

function CreditsMedia({cast, crew, media, initialTab}: {cast: iPeople[], crew: iPeople[], media?: iMediaDetails, initialTab: typeof TABS[number]}) {
    const {closeModal} = useModal();
    const t = useTranslations("media.credits");
    const [activeTab, setActiveTab] = useState<number>(TABS.indexOf(initialTab));

    const switchTab = (tabIdx: number) => {
        if (activeTab !== tabIdx)
            setActiveTab(tabIdx);
    }

    const tab = TABS[activeTab];
    const people = {cast, crew};

    return (<ModalLayout title={t("title")} onCloseAction={closeModal}>
        <div className="w-full sm:w-xl lg:w-216">
            <Tabs tabs={TABS.map((tab) => t(tab))} counts={[undefined, cast.length, crew.length]} activeTab={activeTab} onChange={switchTab}/>
            <div className="h-100 overflow-y-auto p-6">
                {tab === "info" ?
                    (media && <MediaInfo media={media}/>) :
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
                        {people[tab].map((item, index) => <People key={index} p={item} closeModal={closeModal}/>)}
                    </div>
                }
            </div>
        </div>
    </ModalLayout>)
}

function MediaInfo({media}: {media: iMediaDetails}) {
    const t = useTranslations("media.info");
    const locale = useLocale();
    const releaseDate = useFormatDate(media.release_date);
    const serie = media.type === "series" ? media as iSerieDetails : undefined;
    const endDate = useFormatDate(serie && ["Ended", "Canceled"].includes(serie.status) && serie.end_date ? serie.end_date : undefined);
    const languages = new Intl.DisplayNames([locale], {type: "language"});
    const regions = new Intl.DisplayNames([locale], {type: "region"});
    const formatMoney = (value: number) => new Intl.NumberFormat(locale, {style: "currency", currency: "USD", maximumFractionDigits: 0}).format(value);
    const displayName = (names: Intl.DisplayNames, code: string) => {
        try {
            return names.of(code) ?? code;
        } catch {
            return code;
        }
    };

    const rows: [string, string | number | null | undefined | false][] = [
        ["originalTitle", media.original_title],
        ["originalLanguage", media.original_language && displayName(languages, media.original_language)],
        [serie ? "start" : "release", releaseDate],
        ["end", endDate],
        ["seasons", "number_of_seasons" in media && (media as iSerieDetails).number_of_seasons],
        ["episodes", "number_of_episodes" in media && (media as iSerieDetails).number_of_episodes],
        ["countries", media.production_countries?.map((code) => displayName(regions, code)).join(", ")],
        ["companies", media.production_companies?.join(", ")],
        ["budget", !!media.budget && formatMoney(media.budget)],
        ["revenue", !!media.revenue && formatMoney(media.revenue)],
    ];

    return (<dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-left">
        {rows.filter(([, value]) => value).map(([name, value]) => (<React.Fragment key={name}>
            <dt><Label>{t(name)}</Label></dt>
            <dd><p>{value}</p></dd>
        </React.Fragment>))}
    </dl>);
}

function People({p, closeModal}: {p: iPeople, closeModal: () => void}) {
    return (<Link href={`/people/${p.id}`} className="w-full min-w-0" onClick={closeModal}>
        <div className="flex gap-2 items-center">
            <div className="relative border size-20 shrink-0 overflow-hidden">
                <div className="custom-noise opacity-25"/>
                {
                    p.picture ?
                        <LoadingImage className="size-full object-cover" src={p.picture} alt={p.name} height={200} width={200}/> :
                        <div className="size-full bg-gray"/>
                }
            </div>
            <div className="flex flex-col items-start min-w-0">
                <p className="hover:underline">{p.name}</p>
                {p.job && <SmallText className="truncate max-w-full">{p.job}</SmallText>}
                {p.character && <SmallText className="truncate max-w-full">{p.character}</SmallText>}
            </div>
        </div>
    </Link>);
}
