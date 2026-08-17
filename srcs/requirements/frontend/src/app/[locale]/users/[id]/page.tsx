"use client";

import React, {useEffect, useState} from "react";
import ProfileUser, {tTab} from "@/components/ProfileUser";
import ProfileTabMovieHistory from "@/components/ProfileTabMovieHistory";
import useHandleError from "@/hooks/useHandleError";
import {useUser} from "@/services/users.service";
import {useParams} from "next/navigation";
import {ApiError} from "@/services/apiClient";
import ProfileTabComments from "@/components/ProfileTabComments";

export default function Page() {
    const params = useParams();
    const userId = params.id as string;
    const [errorNode, setErrorNode] = useState<React.ReactNode>(null);
    const tabs: tTab = [{name: "history", comp: ProfileTabMovieHistory}, {name: "comments", comp: ProfileTabComments}];
    const handleError = useHandleError();
    const {data, error} = useUser(userId);

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
