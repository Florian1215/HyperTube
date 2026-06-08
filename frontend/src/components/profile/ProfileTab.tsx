import React, {useState} from "react";
import Input from "@/components/Input";
import {iUser} from "@/types/user";
import ProfilePicture from "@/components/ProfilePicture";
import {useNotification} from "@/context/NotificationContext";
import {Button, SmallButton} from "@/components/Buttons";
import {useTranslations} from "next-intl";
import {useApiMutation} from "@/hooks/useApiMutation";
import {patchUser} from "@/api/users";
import {useSetterError} from "@/hooks/useSetterError";


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
    const [email, setEmail] = useState("");
    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [username, setUsername] = useState("");
    const t = useTranslations("profile.fields");
    const tProfile = useTranslations("profile");
    const tSuccess = useTranslations("notifications.success");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [disableBtn, setDisableBtn] = useState(false);
    const {execute} = useApiMutation(setErrors);
    const newSetterError = useSetterError(setErrors, setDisableBtn);

    const handleUpdateUser = async () => {
        const newUser: Record<string, string> = {};

        if (email.trim().length !== 0)
            newUser["email"] = email.trim();
        if (firstname.trim().length !== 0)
            newUser["first_name"] = firstname.trim();
        if (lastname.trim().length !== 0)
            newUser["last_name"] = lastname.trim();
        if (username.trim().length !== 0)
            newUser["username"] = username.trim();

        const makePatchRequest = async () => {
            return await execute((locale) => patchUser(locale, user.id, newUser));
        };

        if (newUser) {
            if (updateUser)
                updateUser(newUser);
            if (newUser["email"]) {
                addNotification(tSuccess("emailChanged"), "warning");
                setEmail("");
            }
            if (newUser["username"])
                setUsername("");
            if (newUser["first_name"])
                setEmail("");
            if (newUser["last_name"])
                setEmail("");
            addNotification(tSuccess("infoChanged"), "success");
            // makePatchRequest().then((data) => { // todo uncomment when endpoint work
            //     if (data) {
            //         if (updateUser)
            //             updateUser(newUser);
            //         if (newUser["email"]) {
            //             addNotification(tSuccess("emailChanged"), "warning");
            //             setEmail("");
            //         }
            //         if (newUser["username"])
            //             setUsername("");
            //         if (newUser["first_name"])
            //             setEmail("");
            //         if (newUser["last_name"])
            //             setEmail("");
            //         addNotification(tSuccess("infoChanged"), "success");
            //     }
            // })
        }
    };

    return (<div className="flex flex-col gap-4 items-start">
        <Input id="profile-email" type="email" placeholder={t("email")} value={email} requestErrorMessage={errors["email"]} setErrorsMessage={newSetterError} onChange={(newValue) => setEmail(newValue)}></Input>

        <div className="flex gap-2 w-full">
            <Input id="profile-firstname" type="firstname" placeholder={t("firstname")} value={firstname} requestErrorMessage={errors["firstname"]} setErrorsMessage={newSetterError} onChange={(newValue) => setFirstname(newValue)}></Input>
            <Input id="profile-lastname" type="lastname" placeholder={t("lastname")} value={lastname} requestErrorMessage={errors["lastname"]} setErrorsMessage={newSetterError} onChange={(newValue) => setLastname(newValue)}></Input>
        </div>

        <Input id="profile-username" type="username" placeholder={t("username")} value={username} requestErrorMessage={errors["username"]} setErrorsMessage={newSetterError} onChange={(newValue) => setUsername(newValue)} className={"max-w-3/5"}></Input>

        <Button className="h-8" onClick={handleUpdateUser} disabled={disableBtn}>{tProfile("saveChanges")}</Button>
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

        { !user.profile_picture && (
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
