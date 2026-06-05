"use client";

import {useParams} from "next/navigation";
import ProfilePage, {tTab} from "@/components/profile/ProfilePage";
import MovieHistoryTab from "@/components/profile/HistoryTab";
import CommentsTab from "@/components/profile/CommentTab";
import {useUser} from "@/api/users";
import React, {useEffect, useState} from "react";
import {useHandleError} from "@/hooks/useApiQuery";
import {ApiError} from "@/api/errors";

export default function Page() {
    const params = useParams();
    const userId = params.id as string;
    const [errorNode, setErrorNode] = useState<React.ReactNode>(null);
    const tabs: tTab = [{name: "history", comp: MovieHistoryTab}, {name: "comments", comp: CommentsTab}];
    const handleError = useHandleError();
    const {data, error} = useUser(userId);

    useEffect(() => {
        if (error) {
            const node = handleError(error as ApiError, "Film");
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setErrorNode(node);
        }
    }, [error, handleError]);

    if (errorNode || !data)
        return (errorNode);

    return <ProfilePage user={data.data} tabs={tabs} />;
}
