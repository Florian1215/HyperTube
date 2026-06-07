import React, {useState} from "react";
import Input from "@/components/Input";
import {useNotification} from "@/context/NotificationContext";
import {Button} from "@/components/Buttons";
import {useTranslations} from "next-intl";
import {useApiMutation} from "@/hooks/useApiMutation";
import {postNewPassword} from "@/api/users";
import {iUser} from "@/types/user";
import {useSetterError} from "@/hooks/useSetterError";

export default function AuthTab({user}: {user: iUser}) {
    const {addNotification} = useNotification();
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewpassword, setConfirmNewPassword] = useState("");
    const t = useTranslations("auth.changePassword");
    const tSuccess = useTranslations("notifications.success");
    const tError = useTranslations("validationErrors");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [disableBtn, setDisableBtn] = useState(false);
    const {execute} = useApiMutation(setErrors);
    const newSetterError = useSetterError(setErrors, setDisableBtn);

    const setNewPasswordError = (value: string) => {
        if (oldPassword == value)
            newSetterError({"new-password": tError("passwordSameAsOld")});
        if (confirmNewpassword && confirmNewpassword != value)
            newSetterError({"confirm-new-password": tError("passwordsDontMatch")});
        setNewPassword(value);
    }
    const setConfirmNewPasswordError = (value: string) => {
        if (newPassword != value)
            newSetterError({"confirm-new-password": tError("passwordsDontMatch")});
        setConfirmNewPassword(value);
    }

    const handlePasswordChange = async () => {
        const makePostRequest = async () => {
            return await execute((locale) => postNewPassword(locale, user.id, oldPassword, newPassword, confirmNewpassword));
        };

        if (oldPassword.length === 0 || newPassword.length === 0 || confirmNewpassword.length === 0) {
            const requiredFieldErrors: Record<string, string> = {};

            if (oldPassword.length === 0)
                requiredFieldErrors["current-password"] = tError("requiredField");
            if (newPassword.length === 0)
                requiredFieldErrors["new-password"] = tError("requiredField");
            if (confirmNewpassword.length === 0)
                requiredFieldErrors["confirm-new-password"] = tError("requiredField");
            setErrors(requiredFieldErrors);
            setDisableBtn(true);
        } else {
            makePostRequest().then((data) => { // todo handle error 401 invalid password
                if (data) {
                    setOldPassword("");
                    setNewPassword("");
                    setConfirmNewPassword("");
                    addNotification(tSuccess("passwordChanged"), "success");
                }
            })
        }
    };

    return (<div className="max-w-9/10 sm:max-w-1/2 xl:max-w-2/6 w-full mx-auto flex flex-col items-start gap-4">
        <Input id="current-password" type="password" value={oldPassword} onChange={setOldPassword} placeholder={t("current")} requestErrorMessage={errors["current-password"]} setErrorsMessage={newSetterError}></Input>
        <Input id="new-password" type="password" value={newPassword} onChange={setNewPasswordError} placeholder={t("new")} requestErrorMessage={errors["new-password"]} setErrorsMessage={newSetterError}></Input>
        <Input id="confirm-new-password" type="password" value={confirmNewpassword} onChange={setConfirmNewPasswordError} placeholder={t("confirm")} requestErrorMessage={errors["confirm-new-password"]} setErrorsMessage={newSetterError}></Input>
        <Button onClick={handlePasswordChange} disabled={disableBtn}>{t("submit")}</Button>
    </div>);
}
