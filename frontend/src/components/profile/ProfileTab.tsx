import React from "react";
import {iUser, iUserToken} from "@/types/user";
import ProfilePicture from "@/components/ProfilePicture";
import {useNotification} from "@/context/NotificationContext";
import {Button, SmallButton} from "@/components/Buttons";
import {useTranslations} from "next-intl";
import {tResponse} from "@/api/client";
import Form from "@/components/Form";
import {patchUser} from "@/api/users";


export function ProfileTab({user, updateUser}: {user: iUser, updateUser?: (patch: Partial<iUser>) => void}) {
    return (<div className="flex flex-col sm:flex-row gap-14 sm:gap-20 xl:gap-30 max-w-9/10 xl:max-w-2/3 w-full justify-center items-center mx-auto">
        <ProfileSection user={user} updateUser={updateUser} />
        <AvatarSection user={user} updateUser={updateUser} />
    </div>);
}

export function AvatarTab({user, updateUser}: {user: iUser, updateUser?: (patch: Partial<iUser>) => void}) {
    return (<div className="max-w-9/10 sm:max-w-1/2 xl:max-w-2/6 w-full mx-auto">
        <AvatarSection user={user} updateUser={updateUser} />
    </div>);
}

function ProfileSection({user, updateUser}: {user: iUser, updateUser?: (patch: Partial<iUser>) => void}) {
    const {addNotification} = useNotification();
    const t = useTranslations("profile.fields");
    const tSuccess = useTranslations("notifications.success");

    const handleUpdateUser = (data: tResponse<iUserToken>) => {
        if (data.data.user.email !== user.email)
            addNotification(tSuccess("emailChanged"), "warning");
        if (updateUser)
            updateUser(data.data.user);
        addNotification(tSuccess("infoChanged"), "success");
    };

    return (<div className="flex flex-col gap-4 items-start">
        <Form formType={"update"} request={patchUser} handleRequest={handleUpdateUser} t={t}
              fields={["email", "first_name", "last_name", "username"]} />
    </div>);
}

function AvatarSection({user, updateUser}: {user: iUser, updateUser?: (patch: Partial<iUser>) => void}) {
    const colors = ["yellow", "pink", "green", "purple", "blue", "red"];
    const t = useTranslations("profile");

    const handleNewPP = (newPP: string | null) => {if (updateUser) updateUser({profile_picture: newPP});}
    const handleSwitchColors = (newColor: string) => {if (updateUser) updateUser({color: newColor});}
    const uploadNewPP = () => {handleNewPP("/images/profile_pictures.jpeg");}

    return (<div className="flex flex-col gap-2 items-center justify-center">
        <ProfilePicture user={user} size={2} className="mb-6" onClick={uploadNewPP}/>
        <Button onClick={uploadNewPP}>{t("selectNewAvatar")}</Button>

        <SmallButton
            className={user.profile_picture ? "text-red  custom-underline-red" : "custom-no-underline"}
            onClick={() => handleNewPP(null)}>{t("remove")}</SmallButton>

        {!user.profile_picture && (
            <div className="grid grid-cols-3 gap-2 mt-4">
                {colors.map((color, index) => (
                    <ProfilePicture
                        key={index}
                        user={user}
                        color={color}
                        className={user.color === color ? "border-3" : ""}
                        onClick={() => handleSwitchColors(color)}
                    />))}
            </div>)}
    </div>);
}
