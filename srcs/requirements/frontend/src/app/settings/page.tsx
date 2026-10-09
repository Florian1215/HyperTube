"use client";

import React, {useEffect} from "react";
import {useRouter} from "@/i18n/navigation";
import useAuth from "@/contexts/AuthContext";
import {iToken, iUser, PREFERRED_LANGUAGES, tPreferredLanguage} from "@/types/user";
import useNotification from "@/contexts/NotificationContext";
import {useLocale, useTranslations} from "next-intl";
import Form from "@/components/ui/Form";
import {deleteUser, patchUser, postNewPassword} from "@/services/users.service";
import useModal from "@/contexts/ModalContext";
import useApiMutation from "@/hooks/useApiMutation";
import ProfilePicture from "@/components/ProfilePicture";
import TextButton from "@/components/ui/Button/TextButton";
import Toggle from "@/components/ui/Toggle";
import RadioButton from "@/components/ui/Button/RadioButton";

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

    return (<div className="flex flex-col gap-10 sm:gap-14 max-w-9/10 md:max-w-3xl w-full mx-auto mt-12 pb-10">
        <h2 className="text-center">{t("title")}</h2>
        <SettingsSection title={t("profile")}>
            <ProfileSection user={user} updateUser={updateUser}/>
        </SettingsSection>
        <SettingsSection title={t("avatar")}>
            <AvatarSection user={user} updateUser={updateUser}/>
        </SettingsSection>
        <SettingsSection title={t("password")}>
            <PasswordSection/>
        </SettingsSection>
        <SettingsSection title={t("account")}>
            <AccountSection/>
        </SettingsSection>
    </div>);
}

function SettingsSection({title, children}: {title: string, children: React.ReactNode}) {
    return (<section className="flex flex-col gap-4">
        <span className="uppercase font-wide text-xl font-bold border-b pb-2">{title}</span>
        {children}
    </section>);
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

    const handlePreferredLanguage = async (preferredLanguage: tPreferredLanguage) => {
        const data = await execute((locale) => patchUser(locale, ["preferred_language", preferredLanguage], user.id));
        if (data && updateUser)
            updateUser({preferred_language: data.preferred_language});
    };

    return (<div className="flex flex-col gap-4 items-start">
        <Form formType="update" request={patchUser} handleRequest={handleUpdateUser} t={t} extraParam={user.id}
              fields={["username"]} />
        <div className="flex items-end gap-3">
            <Toggle val={user.group_series ?? true} setter={handleGroupSeries}/>
            <p className="text-sm leading-5">{tProfile("groupBySeries")}</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex">
                {PREFERRED_LANGUAGES.map((language) => <RadioButton key={language} selected={(user.preferred_language ?? "vo") === language} onClick={() => handlePreferredLanguage(language)}>{language}</RadioButton>)}
            </div>
            <p className="text-sm">{tProfile("preferredLanguage")}</p>
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

    return (<div className="flex flex-col gap-2 items-start">
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

function PasswordSection() {
    const {addNotification} = useNotification();
    const t = useTranslations("auth.changePassword");
    const tSuccess = useTranslations("notifications.success");

    const handlePasswordChange = () => {
        addNotification(tSuccess("passwordChanged"), "success");
    };

    return (<div className="w-full sm:max-w-1/2 flex flex-col items-start">
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

    return (<div className="flex">
        <TextButton className="text-red custom-underline-red" onClick={handleDeleteAccount}>{tProfile("deleteAccount")}</TextButton>
    </div>);
}
