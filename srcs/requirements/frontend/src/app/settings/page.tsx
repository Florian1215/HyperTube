"use client";

import React, {useEffect, useRef} from "react";
import {useRouter} from "@/i18n/navigation";
import useAuth from "@/contexts/AuthContext";
import {iToken, iUser} from "@/types/user";
import useNotification from "@/contexts/NotificationContext";
import {useLocale, useTranslations} from "next-intl";
import Form from "@/components/ui/Form";
import {deleteUser, patchUser, PICTURE_MAX_SIZE_MB, PICTURE_TYPES, postNewPassword, uploadProfilePicture} from "@/services/users.service";
import useModal from "@/contexts/ModalContext";
import useApiMutation from "@/hooks/useApiMutation";
import ProfilePicture from "@/components/ProfilePicture";
import TextButton from "@/components/ui/Button/TextButton";
import PageMeta from "@/components/PageMeta";

export default function Page() {
    const {user, loading, updateUser} = useAuth();
    const router = useRouter();
    const t = useTranslations("settings");
    const tMeta = useTranslations("meta");
    const meta = <PageMeta title={tMeta("settings")} description={tMeta("settingsDescription")}/>;

    useEffect(() => {
        if (!user && !loading)
            router.push("/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, loading]);

    if (!user)
        return meta;

    return (<div className="flex flex-col items-center mt-12 pb-16 px-4">
        {meta}
        <h2 className="text-center">{t("title")}</h2>
        <div className="flex flex-col items-center gap-12 sm:gap-24 w-full max-w-xs mt-12 sm:mt-16 [&_form>button]:w-full">
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
    const tSuccess = useTranslations("notifications.success");

    const handleUpdateUser = (data: iToken | iUser) => {
        if ("username" in data) {
            if (updateUser)
                updateUser(data);
            addNotification(tSuccess("infoChanged"), "success");
        }
    };

    return (<div className="flex flex-col gap-8 w-full">
        <Form formType="update" request={patchUser} handleRequest={handleUpdateUser} t={t} extraParam={user.id}
              fields={["username"]} />
    </div>);
}

function AvatarSection({user, updateUser}: {user: iUser, updateUser?: (patch: Partial<iUser>) => void}) {
    const colors = ["yellow", "pink", "green", "purple", "blue", "red"];
    const t = useTranslations("profile");
    const tError = useTranslations("notifications.error");
    const {addNotification} = useNotification();
    const {execute} = useApiMutation();
    const fileRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        e.target.value = "";
        if (!file)
            return;
        if (!PICTURE_TYPES.includes(file.type))
            return addNotification(tError("pictureInvalid"), "error");
        if (file.size > PICTURE_MAX_SIZE_MB * 1024 * 1024)
            return addNotification(tError("pictureTooLarge", {max: PICTURE_MAX_SIZE_MB}), "error");
        const data = await execute((locale) => uploadProfilePicture(locale, user.id, file));
        if (data && updateUser)
            updateUser({profile_picture: data.profile_picture});
    };

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
        <input ref={fileRef} type="file" accept={PICTURE_TYPES.join(",")} className="hidden" onChange={(e) => void handleUpload(e)}/>
        <TextButton className="hover:text-accent" onClick={() => fileRef.current?.click()}>{t("uploadPicture")}</TextButton>
        {user.profile_picture && <TextButton className="text-red hover:text-red-hover"
            onClick={() => handleNewAvatar(["profile_picture", ""])}>{t("remove")}</TextButton>}

        <div className="flex justify-between w-full mt-4">
            {colors.map((color, index) => (
                <button key={index} onClick={() => handleNewAvatar(["color", color])}>
                    <ProfilePicture user={{...user, profile_picture: null}} color={color} className={user.color === color ? "border-3" : ""}/>
                </button>
            ))}
        </div>
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
