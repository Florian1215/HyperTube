import Pagination from "@/components/ui/Pagination";
import computeTotalPage from "@/utils/computeTotalPage";
import React, {useEffect, useState} from "react";
import {deleteApp, useApplications} from "@/services/auth.service";
import {iApplication} from "@/types/api";
import SmallText from "@/components/ui/SmallText";
import {useLocale, useTranslations} from "next-intl";
import Button from "@/components/ui/Button/Button";
import useModal, {ModalState} from "@/contexts/ModalContext";
import IconButton from "@/components/ui/Button/IconButton";
import {TrashIcon} from "@/components/Icons";
import Code from "@/components/ui/Code";
import Label from "@/components/ui/Label";
import Join from "@/components/Join";

export default function APITab() {
    const locale = useLocale();
    const [index, setIndex] = useState(0);
    const {data} = useApplications(index);
    const [apps, setApps] = useState<iApplication[]>([]);
    const totalPage = computeTotalPage(data);
    const {openModal} = useModal();
    const t = useTranslations("profile.application");
    const deleteDisplayApp = (appId: number) => deleteApp(locale, appId).then(() => setApps(apps.filter(a => a.id !== appId)));
    const setApplications = (newApp: iApplication) => {
        setApps(prev => {
            if (prev.find(a => a.id === newApp.id))
                return prev.map(app => app.id === newApp.id ? newApp : app);
            return [...prev, newApp];
        });
    }

    useEffect(() => {
        if (data)
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setApps(data.data);
    }, [data]);

    return (<div className="mx-auto space-y-6">
        {
            (apps && apps.length > 0) ?
            <Pagination currenIndex={index} totalPage={totalPage} onClick={setIndex} variableMT={true}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {apps.map((a, idx) => <Application locale={locale} openModal={openModal} deleteDisplayApp={deleteDisplayApp} key={idx} app={a} setApplications={setApplications} t={t}/>)}
                </div>
            </Pagination> :
                <SmallText>{t("noApplicationsYet")}</SmallText>
        }
        <CreateNewApplication openModal={openModal} setApplications={setApplications} t={t} />
    </div>);
}

function Application({app, openModal, deleteDisplayApp, locale, setApplications, t}: {app: iApplication, openModal: (modal: ModalState) => void, deleteDisplayApp: (appId: number) => void, locale: string, setApplications: (newApp: iApplication) => void, t: (txt: string) => string}) {
    const date = new Date(app.created_at);
    const createdAt = new Intl.DateTimeFormat(locale, {day: "2-digit", month: "2-digit", year: "numeric"}).format(date).replace(/[\/-]/g, ".");

    return (<div className="w-full flex justify-between group/card items-center border p-5 custom-shadow-animation-l">
        <div className="space-y-1 w-full">
            <div className="flex justify-between items-center hover:cursor-pointer group/title mb-2">
                <div className="flex w-9/10 items-end gap-2" onClick={() => openModal({type: "application", appId: String(app.id), setApplications: setApplications})}>
                    <h3 className="group-hover/title:underline truncate">{app.name}</h3>
                    <span>{createdAt}</span>
                </div>
                <div className="opacity-0 group-hover/card:opacity-100">
                    <IconButton onClick={() => openModal({type: "delete-confirmation", deleteFunc: deleteDisplayApp, deleteObjId: app.id})} hoverColor="red">{(color: string) => <TrashIcon color={color} size={25}/>}</IconButton>
                </div>
            </div>
            <Code label="client_id">{app.client_id}</Code>
            {app.client_secret && <Code label="client_secret">{app.client_secret}</Code>}
            <div className="mt-2"><Label>{t("createModal.redirect_uri")}</Label>: <a href={app.redirect_uri} target="_blank" className="inline hover:underline hover:underline-offset-3 text-sm text-gray">{app.redirect_uri}</a></div>
            <div><Label>{t("createModal.scope")}</Label>: {<Join items={app.scope.split(",")}/>}</div>
        </div>
    </div>)
}

function CreateNewApplication({setApplications, t, openModal}: {setApplications: (newApp: iApplication) => void, t: (str: string) => string, openModal: (modal: ModalState) => void}) {
    return (<div className="text-center">
        <Button onClick={() => openModal({type: "application", setApplications: setApplications})}>{t("createApplication")}</Button>
    </div>)
}
