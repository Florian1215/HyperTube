"use client";

import React, {useEffect} from "react";
import {useRouter} from "@/i18n/navigation";
import useAuth from "@/contexts/AuthContext";
import {iToken, iUser} from "@/types/user";
import useNotification from "@/contexts/NotificationContext";
import {useLocale, useTranslations} from "next-intl";
import Form from "@/components/ui/Form";
import {deleteUser, patchUser, postNewPassword} from "@/services/users.service";
import useModal from "@/contexts/ModalContext";
import useApiMutation from "@/hooks/useApiMutation";
import ProfilePicture from "@/components/ProfilePicture";
import TextButton from "@/components/ui/Button/TextButton";
import Toggle from "@/components/ui/Toggle";

export default function Page() {
    const {user, loading, updateUser} = useAuth();
    const router = useRouter();
    const t = useTranslations("settings");

    useEffect(() => {
        if (!user && !loading)
            router.push("/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, loading]);

    if (!user)
        return null;

    return (<div className="flex flex-col items-center mt-12 pb-16 px-4">
        <h2 className="text-center">{t("title")}</h2>
        <div className="flex flex-col items-center gap-16 sm:gap-24 w-full max-w-64 mt-12 sm:mt-16 [&_form>button]:w-full">
            <AvatarSection user={user} updateUser={updateUser}/>
            <ProfileSection user={user} updateUser={updateUser}/>
            <PasswordSection/>
            <AccountSection/>
        </div>
    </div>);
}

function ProfileSection({user, updateUser}: {user: iUser, updateUser?: (patch: Partial<iUser>) => void}) {
    const {addNotification} = useNotification();
    const t = useTranslations("profile.fields");
    const tProfile = useTranslations("profile");
    const tSuccess = useTranslations("notifications.success");
    const {execute} = useApiMutation();

    const handleUpdateUser = (data: iToken | iUser) => {
        if ("username" in data) {
            if (updateUser)
                updateUser(data);
            addNotification(tSuccess("infoChanged"), "success");
        }
    };

    const handleGroupSeries = async (groupSeries: boolean) => {
        const data = await execute((locale) => patchUser(locale, ["group_series", String(groupSeries)], user.id));
        if (data && updateUser)
            updateUser({group_series: data.group_series});
    };

    return (<div className="flex flex-col gap-8 w-full">
        <Form formType="update" request={patchUser} handleRequest={handleUpdateUser} t={t} extraParam={user.id}
              fields={["username"]} />
        <div className="flex items-end justify-between gap-3 w-full">
            <p className="text-sm leading-5 text-left">{tProfile("groupBySeries")}</p>
            <Toggle val={user.group_series ?? true} setter={handleGroupSeries}/>
        </div>
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

    return (<div className="flex flex-col gap-2 items-center w-full">
        <ProfilePicture user={user} size={2} className="mb-2" />
        <TextButton
            className={user.profile_picture ? "text-red hover:text-red-hover" : ""}
            onClick={() => handleNewAvatar(["profile_picture", ""])}>{t("remove")}</TextButton>

        {!user.profile_picture && (
            <div className="flex justify-between w-full mt-4">
                {colors.map((color, index) => (
                    <button key={index} onClick={() => handleNewAvatar(["color", color])}>
                        <ProfilePicture user={user} color={color} className={user.color === color ? "border-3" : ""}/>
                    </button>
                ))}
            </div>)}
    </div>);
}

function PasswordSection() {
    const {addNotification} = useNotification();
    const t = useTranslations("auth.changePassword");
    const tSuccess = useTranslations("notifications.success");

    const handlePasswordChange = () => {
        addNotification(tSuccess("passwordChanged"), "success");
    };

    return (<div className="w-full">
        <Form formType="auth" request={postNewPassword} handleRequest={handlePasswordChange} t={t}
              fields={["current-password", "new-password", "confirm-new-password"]} />
    </div>);
}

function AccountSection() {
    const tProfile = useTranslations("profile");
    const {user, logout} = useAuth();
    const {openModal} = useModal();
    const locale = useLocale();

    const handleDeleteAccount = () => {
        if (!user)
            return;
        openModal({type: "delete-confirmation", deleteObjId: user.id, deleteFunc: async (userId: number) => {
            await deleteUser(locale, userId);
            logout();
        }});
    };

    return (<div className="flex justify-center w-full">
        <TextButton className="text-red hover:text-red-hover" onClick={handleDeleteAccount}>{tProfile("deleteAccount")}</TextButton>
    </div>);
}
