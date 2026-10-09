"use client";

import React, {useEffect, useState} from "react";
import {useParams} from "next/navigation";
import {useTranslations} from "next-intl";
import useAuth from "@/contexts/AuthContext";
import useHandleError from "@/hooks/useHandleError";
import {ApiError} from "@/services/apiClient";
import {usePerson, usePersonMedias} from "@/services/people.service";
import {iPerson, PERSON_ROLES, tPersonRole} from "@/types/media";
import computeTotalPage from "@/utils/computeTotalPage";
import useFormatDate from "@/utils/formatDate";
import ExpandableText from "@/components/ui/ExpandableText";
import Label from "@/components/ui/Label";
import LoadingImage from "@/components/ui/LoadingImage";
import LoadingText from "@/components/LoadingText";
import MediaCard from "@/components/MediaCard";
import Pagination from "@/components/ui/Pagination";
import PeopleWatchedCount from "@/components/PeopleWatchedCount";
import SmallText from "@/components/ui/SmallText";
import Tabs from "@/components/ui/Tabs";

const DEPARTMENT_ROLES: Record<string, tPersonRole> = {Acting: "cast", Directing: "directing", Writing: "writing", Creator: "writing"};

export default function Page() {
    const params = useParams();
    const id = params.id as string;
    const {user} = useAuth();
    const t = useTranslations("people");
    const {data: person, error} = usePerson(id);
    const [errorNode, setErrorNode] = useState<React.ReactNode>(null);
    const handleError = useHandleError();
    const [selectedRole, setSelectedRole] = useState<tPersonRole>();
    const [index, setIndex] = useState(1);
    const [counts, setCounts] = useState<Record<tPersonRole, number>>();
    const roles = PERSON_ROLES.filter((role) => !counts || counts[role] > 0);
    const mainRole = DEPARTMENT_ROLES[person?.department ?? ""] ?? "crew";
    const activeRole = selectedRole ?? (roles.includes(mainRole) ? mainRole : roles[0] ?? mainRole);
    const {data: medias} = usePersonMedias(id, activeRole, index, user?.id, !!person);

    useEffect(() => {
        if (medias)
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCounts(medias.counts);
    }, [medias]);

    useEffect(() => {
        if (error) {
            const node = handleError(error as ApiError, "People");
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setErrorNode(node);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [error]);

    if (errorNode)
        return (errorNode);

    const switchTab = (tab: number) => {
        setSelectedRole(roles[tab]);
        setIndex(1);
    }

    return (<div className="flex flex-col gap-6 sm:gap-12 xl:gap-16 px-2 md:px-4 mt-12">
        {person ? <PersonInfo person={person}/> : <LoadingText center={true}/>}
        {counts && roles.length > 0 && <Tabs tabs={roles.map((role) => t(role))} counts={roles.map((role) => counts[role])} activeTab={roles.indexOf(activeRole)} onChange={switchTab}/>}
        {medias && medias.results.length === 0 ?
            <SmallText>{t("noMedias")}</SmallText> :
            <Pagination currentIndex={index} onClick={setIndex} totalPage={computeTotalPage(medias)} variableMT={true}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-4">
                    {medias ?
                        medias.results.map((media) => (<MediaCard key={`${media.type}-${media.id}`} media={media} user={user} label={media.roles.join(", ")}/>)) :
                        [...Array(3)].map((_, i) => (<MediaCard key={i} user={user}/>))
                    }
                </div>
            </Pagination>}
        <div />
    </div>);
}

function PersonInfo({person}: {person: iPerson}) {
    const t = useTranslations("people");
    const {user} = useAuth();
    const birthday = useFormatDate(person.birthday ?? undefined);
    const deathday = useFormatDate(person.deathday ?? undefined);
    const departmentKey = `departments.${person.department}`;
    const department = person.department && (t.has(departmentKey) ? t(departmentKey) : person.department);
    const rows = [
        ["born", [birthday, person.place_of_birth].filter(Boolean).join(" · ")],
        ["died", deathday],
    ];

    return (<div className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-center w-full max-w-4xl mx-auto">
        <div className="relative border w-4/5 sm:w-62 aspect-3/2 sm:aspect-5/6 shrink-0 overflow-hidden">
            {
                person.picture ?
                    <LoadingImage className="size-full object-cover" src={person.picture} alt={person.name} height={750} width={500} loading="eager"/> :
                    <div className="size-full bg-gray"/>
            }
            <div className="custom-noise"/>
        </div>
        <div className="flex flex-col gap-2 xl:gap-4 min-w-0 items-center sm:items-start text-center sm:text-left">
            <div>
                <h3>{person.name}</h3>
                <div className="flex items-center justify-center sm:justify-start gap-3">
                    {department && <p className="uppercase">{department}</p>}
                    {user && <PeopleWatchedCount user={user} people={person} total={person.medias_count} size={20}/>}
                </div>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-left">
                {rows.filter(([, value]) => value).map(([name, value]) => (<React.Fragment key={name}>
                    <dt><Label>{t(name as string)}</Label></dt>
                    <dd><p>{value}</p></dd>
                </React.Fragment>))}
            </dl>
            {person.biography.length > 0 && <ExpandableText lines={3}>{person.biography}</ExpandableText>}
        </div>
    </div>);
}
