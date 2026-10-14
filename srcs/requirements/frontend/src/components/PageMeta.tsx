"use client";

import React from "react";
import {useTranslations} from "next-intl";

const SITE_NAME = "Hypertube";
const DESCRIPTION_MAX_LENGTH = 160;

function truncate(text: string) {
    const clean = text.replace(/\s+/g, " ").trim();
    return clean.length > DESCRIPTION_MAX_LENGTH ? `${clean.slice(0, DESCRIPTION_MAX_LENGTH - 1).trimEnd()}…` : clean;
}

export default function PageMeta({title, description}: {title?: string, description?: string}) {
    const t = useTranslations("meta");

    return (<>
        <title>{title ? `${title} - ${SITE_NAME}` : SITE_NAME}</title>
        <meta name="description" content={truncate(description || t("defaultDescription"))}/>
    </>);
}
