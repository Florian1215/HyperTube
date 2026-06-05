"use client";

import React, {useEffect} from "react";
import {ProfileTab, AvatarTab} from "@/components/profile/ProfileTab";
import AuthTab from "@/components/profile/AuthTab";
import {useAuth} from "@/context/AuthContext";
import ProfilePage, {tTab} from "@/components/profile/ProfilePage";
import MovieHistoryTab from "@/components/profile/HistoryTab";
import CommentsTab from "@/components/profile/CommentTab";
import {useRouter} from "@/i18n/navigation";

export default function Page() {
    const {user, loading, updateUser} = useAuth();
    const router = useRouter();
    const tabs: tTab = [{name: "history", comp: MovieHistoryTab}, {name: "comments", comp: CommentsTab}];

    useEffect(() => {
        if (!loading && !user)
            router.push("/");
    }, [user, loading, router]);


    if (!user)
        return null;

    if (user?.oauth_method && (user.oauth_method === "42" || user.oauth_method === "github"))
        tabs.unshift({name: "avatar", comp: AvatarTab});
    else {
        tabs.unshift({name: "auth", comp: AuthTab});
        tabs.unshift({name: "profile", comp: ProfileTab});
    }

    return <ProfilePage user={user} updateUser={updateUser} tabs={tabs} />;
}
