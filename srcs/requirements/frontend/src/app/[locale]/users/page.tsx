"use client";

import React, {useEffect} from "react";
import {useRouter} from "@/i18n/navigation";
import useAuth from "@/contexts/AuthContext";
import {iToken, iUser} from "@/types/user";
import useNotification from "@/contexts/NotificationContext";
import {useTranslations} from "next-intl";
import Form from "@/components/ui/Form";
import {patchUser, postNewPassword} from "@/services/users.service";
import useApiMutation from "@/hooks/useApiMutation";
import ProfilePicture from "@/components/ProfilePicture";
import TextButton from "@/components/ui/Button/TextButton";
import ProfileUser, {tTab} from "@/components/ProfileUser";
import ProfileTabMovieHistory from "@/components/ProfileTabMovieHistory";
import ProfileTabComments from "@/components/ProfileTabComments";

export default function Page() {
    const {user, loading, updateUser} = useAuth();
    const router = useRouter();
    const tabs: tTab = [{name: "profile", comp: ProfileTab}, {name: "auth", comp: AuthProfileTab}, {name: "history", comp: ProfileTabMovieHistory}, {name: "comments", comp: ProfileTabComments}];

    useEffect(() => {
        if (!user && !loading)
            router.push("/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, loading]);


    if (!user)
        return null;

    return <ProfileUser user={user} updateUserAction={updateUser} tabs={tabs} />;
}

function ProfileTab({user, updateUser}: {user: iUser, updateUser?: (patch: Partial<iUser>) => void}) {
    return (<div className="flex flex-col sm:flex-row gap-14 sm:gap-20 xl:gap-30 max-w-9/10 xl:max-w-2/3 w-full justify-center items-center mx-auto">
        <ProfileSection user={user} updateUser={updateUser} />
        <AvatarSection user={user} updateUser={updateUser} />
    </div>);
}

function ProfileSection({user, updateUser}: {user: iUser, updateUser?: (patch: Partial<iUser>) => void}) {
    const {addNotification} = useNotification();
    const t = useTranslations("profile.fields");
    const tSuccess = useTranslations("notifications.success");

    const handleUpdateUser = (data: iToken | iUser) => {
        if ("username" in data) {
            if (updateUser)
                updateUser(data);
            addNotification(tSuccess("infoChanged"), "success");
        }
    };

    return (<div className="flex flex-col gap-4 items-start">
        <Form formType="update" request={patchUser} handleRequest={handleUpdateUser} t={t} extraParam={user.id}
              fields={["username"]} />
    </div>);
}

function AvatarSection({user, updateUser}: {user: iUser, updateUser?: (patch: Partial<iUser>) => void}) {
    const colors = ["yellow", "pink", "green", "purple", "blue", "red"];
    const t = useTranslations("profile");
    const {execute} = useApiMutation();

    const handleNewAvatar = (newData: string[]) => {
        const makePostRequest = async () => {
            return await execute((locale) => patchUser(locale, newData, user.id));
        };

        makePostRequest().then((data) => {
            if (data) {
                const newPartialUser: Record<string, string> = {};
                newPartialUser[newData[0]] = newData[1];
                if (updateUser)
                    updateUser(newPartialUser);
            }
        })
    }

    return (<div className="flex flex-col gap-2 items-center justify-center">
        <ProfilePicture user={user} size={2} className="mb-2" />
        <TextButton
            className={user.profile_picture ? "text-red custom-underline-red" : "hover:no-underline"}
            onClick={() => handleNewAvatar(["profile_picture", ""])}>{t("remove")}</TextButton>

        {!user.profile_picture && (
            <div className="grid grid-cols-3 gap-2 mt-4">
                {colors.map((color, index) => (
                    <button key={index} onClick={() => handleNewAvatar(["color", color])}>
                        <ProfilePicture user={user} color={color} className={user.color === color ? "border-3" : ""}/>
                    </button>
                ))}
            </div>)}
    </div>);
}

function AuthProfileTab() {
    const {addNotification} = useNotification();
    const t = useTranslations("auth.changePassword");
    const tSuccess = useTranslations("notifications.success");

    const handlePasswordChange = () => {
        addNotification(tSuccess("passwordChanged"), "success");
    };

    return (<div className="max-w-9/10 sm:max-w-1/2 xl:max-w-2/6 w-full mx-auto flex flex-col items-start gap-4">
        <Form formType="auth" request={postNewPassword} handleRequest={handlePasswordChange} t={t}
              fields={["current-password", "new-password", "confirm-new-password"]} />
    </div>);
}
