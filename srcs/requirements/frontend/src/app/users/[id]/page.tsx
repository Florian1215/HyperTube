"use client";

import React, {useEffect, useState} from "react";
import ProfileUser from "@/components/ProfileUser";
import {ProfileTabMovies, ProfileTabSeries} from "@/components/ProfileTabMediaHistory";
import useHandleError from "@/hooks/useHandleError";
import {useUser} from "@/services/users.service";
import {useParams} from "next/navigation";
import {ApiError} from "@/services/apiClient";
import ProfileTabComments from "@/components/ProfileTabComments";
import {tTab} from "@/types/utils";
import useAuth from "@/contexts/AuthContext";

export default function Page() {
    const params = useParams();
    const userId = params.id as string;
    const [errorNode, setErrorNode] = useState<React.ReactNode>(null);
    const tabs: tTab = [{name: "movies", comp: ProfileTabMovies}, {name: "series", comp: ProfileTabSeries}, {name: "comments", comp: ProfileTabComments}];
    const handleError = useHandleError();
    const {user, loading} = useAuth();
    const {data, error} = useUser(userId, !loading, user?.id);

    useEffect(() => {
        if (error) {
            const node = handleError(error as ApiError, "User");
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setErrorNode(node);
        }
    }, [error, handleError]);

    if (errorNode || !data)
        return (errorNode);

    return <ProfileUser user={data} tabs={tabs} />;
}
