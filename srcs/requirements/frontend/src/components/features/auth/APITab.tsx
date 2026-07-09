import Pagination from "@/components/ui/Pagination";
import computeTotalPage from "@/utils/computeTotalPage";
import {useEffect, useState} from "react";
import {deleteApp, useApplications} from "@/services/auth.service";
import {iApplication} from "@/types/api";
import SmallText from "@/components/ui/SmallText";
import {useLocale, useTranslations} from "next-intl";
import Button from "@/components/ui/Button/Button";
import useModal, {ModalState} from "@/contexts/ModalContext";
import IconButton from "@/components/ui/Button/IconButton";
import {TrashIcon} from "@/components/Icons";
import Code from "@/components/ui/Code";

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

    return (<div className="mx-auto space-y-5">
        {
            (apps && apps.length > 0) ?
            <Pagination currenIndex={index} totalPage={totalPage} onClick={setIndex}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {apps.map((a, idx) => <Application locale={locale} openModal={openModal} deleteDisplayApp={deleteDisplayApp} key={idx} app={a} setApplications={setApplications}/>)}
                </div>
            </Pagination> :
                <SmallText>{t("noApplicationsYet")}</SmallText>
        }
        <CreateNewApplication openModal={openModal} setApplications={setApplications} t={t} />
    </div>);
}

function Application({app, openModal, deleteDisplayApp, locale, setApplications}: {app: iApplication, openModal: (modal: ModalState) => void, deleteDisplayApp: (appId: number) => void, locale: string, setApplications: (newApp: iApplication) => void}) {
    const date = new Date(app.created_at);
    const createdAt = new Intl.DateTimeFormat(locale, {day: "2-digit", month: "2-digit", year: "numeric"}).format(date).replace(/[\/-]/g, ".");

    // todo show uri
    // todo remake scope validation
    // todo remake scope ui
    return (<div className="w-full flex justify-between group items-center border p-5 custom-shadow-animation-l">
        <div className="space-y-2 w-full">
            <div className="flex justify-between items-center hover:cursor-pointer">
                <div className="flex w-9/10 items-end gap-2" onClick={() => openModal({type: "application", appId: String(app.id), setApplications: setApplications})}>
                    <h3 className="truncate">{app.name}</h3>
                    <span>{createdAt}</span>
                </div>
                <div className="opacity-0 group-hover:opacity-100">
                    <IconButton onClick={() => openModal({type: "delete-confirmation", deleteFunc: deleteDisplayApp, deleteObjId: app.id})} hoverColor="red">{(color: string) => <TrashIcon color={color} size={25}/>}</IconButton>
                </div>
            </div>
            <Code label="client_id">{app.client_id}</Code>
            {app.client_secret && <Code label="client_secret">{app.client_secret}</Code>}
            <p>Scope: {app.scope}</p>
        </div>
    </div>)
}

function CreateNewApplication({setApplications, t, openModal}: {setApplications: (newApp: iApplication) => void, t: (str: string) => string, openModal: (modal: ModalState) => void}) {
    return (<div className="text-center">
        <Button onClick={() => openModal({type: "application", setApplications: setApplications})}>{t("createApplication")}</Button>
    </div>)
}
