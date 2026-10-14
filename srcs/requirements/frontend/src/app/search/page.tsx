"use client";

import {useTranslations} from "next-intl";
import Search from "@/components/Search";
import PageMeta from "@/components/PageMeta";

export default function Page() {
    const t = useTranslations("meta");

    return (<>
        <PageMeta title={t("search")} description={t("searchDescription")}/>
        <Search/>
    </>);
}
