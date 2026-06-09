import {Button, SmallButton} from "@/components/Buttons";
import React, {useEffect, useRef, useState} from "react";
import Input from "@/components/Input";
import {useTranslations} from "next-intl";
import {useApiMutation} from "@/hooks/useApiMutation";
import {tResponse} from "@/api/client";
import {iUserToken} from "@/types/user";

type formType = "auth" | "update" |  "signin" | "register" | "reset-password";
type fieldType = "email" | "login" | "first_name" |  "last_name" | "username" | "password";

export default function Form({formType, request, handleRequest, t, fields, handleForgotPassword}: {formType: formType, request: (locale: string, data: string[]) => Promise<tResponse<iUserToken>>, handleRequest: (data: tResponse<iUserToken>) => void, t: (key: string) => string, fields: fieldType[], handleForgotPassword?: () => void}) {
    const [fieldsValue, setFieldsValue] = useState<string[]>(Array(fields.length).fill(""));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [disableBtn, setDisableBtn] = useState(false);
    const tError = useTranslations("validationErrors");
    const [focusedIndex, setFocusedIndex] = useState((formType === "update" || formType === "auth")? -1 : 0);
    const {execute} = useApiMutation(setErrors, setFocusedIndex, formType);
    const fieldRefs = useRef<HTMLInputElement[]>([]);

    useEffect(() => {
        if (focusedIndex >= 0)
            fieldRefs.current[focusedIndex]?.focus();
    }, [focusedIndex]);

    const getId = (field: fieldType | number) => (typeof field  === "number" ? fields[field] : field) + "-" + formType;
    const hasError = (error: Record<string, string>) => Object.keys(error).length > 0 && Object.values(error).some((v) => !!v);

    const newSetterError = (value: Record<string, string>) => {
        setErrors((prevErrors) => {
            const newErrors = {...prevErrors, ...value};
            if (prevErrors[getId("email")] === tError("atLeastOneField") && !value[getId("email")])
                newErrors[getId("email")] = "";
            setDisableBtn(hasError(newErrors));
            return newErrors;
        });
    };

    // const setNewPasswordError = (value: string) => { todo handle
    //     if (oldPassword == value)
    //         newSetterError({"new-password": tError("passwordSameAsOld")});
    //     if (confirmNewpassword && confirmNewpassword != value)
    //         newSetterError({"confirm-new-password": tError("passwordsDontMatch")});
    //     setNewPassword(value);
    // }
    // const setConfirmNewPasswordError = (value: string) => {
    //     if (newPassword != value)
    //         newSetterError({"confirm-new-password": tError("passwordsDontMatch")});
    //     setConfirmNewPassword(value);
    // }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key !== "Enter")
            return ;
        e.preventDefault();
        const isLastField = index === fields.length - 1;
        if (isLastField) {
            if (hasError(errors)) {
                for (let i = 0; i < fields.length; i++) {
                    if (errors[getId(i)]) {
                        setFocusedIndex(i);
                        return ;
                    }
                }
            }
            onSubmit();
        }
        else
            setFocusedIndex(index + 1);
    }

    const onSubmit = () => {
        const makeRequest = async () => {
            return await execute((locale) => request(locale, fieldsValue));
        };

        if (disableBtn)
            return ;
        const requiredErrors: Record<string, string> = {};

        if (formType === "update" && fieldsValue.filter((v) => v.trim().length !== 0).length === 0) {
            newSetterError({[getId(0)]: tError("atLeastOneField")});
            setFocusedIndex(0);
        } else if (formType !== "update" && fieldsValue.filter((v) => v.trim().length === 0).length !== 0) {
            let focusIsSet = false;

            fieldsValue.map((val: string, idx: number) => {
                if (val.trim().length === 0) {
                    requiredErrors[getId(idx)] = tError("requiredField");
                    if (!focusIsSet) {
                        focusIsSet = true;
                        setFocusedIndex(idx);
                    }
                }
            })
            newSetterError(requiredErrors);
        } else {
            makeRequest().then((data) => {
                if (data) {
                    handleRequest(data);
                    setFieldsValue(Array(fields.length).fill(""));
                }
            })
            fieldRefs.current[focusedIndex]?.blur();
            setFocusedIndex(-1);
        }
    };

    const RenderInput = (type: fieldType, idx: number, className?: string) =>
        <Input key={idx} id={getId(type)} type={type === "password" ? "password" : "text"} placeholder={t(type)}
               value={fieldsValue[idx]} idx={idx} onChange={setFieldsValue} className={className + ((formType === "register" && (type === "username" || type === "password")) ? " " : "")}
               requestErrorMessage={errors[getId(type)]} setErrorsMessage={newSetterError} ref={(el: HTMLInputElement) => {fieldRefs.current[idx] = el;}}
               onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, idx)}></Input>;

    return (<form id={formType} className="w-full" onSubmit={(e) => {e.preventDefault(); onSubmit();}}>
        {fields.map((field, idx) => {
            if (field === "first_name") {
                return (<div key={"div"} className="flex gap-2">
                    {RenderInput(field, idx)}
                    {RenderInput(fields[idx + 1], idx + 1)}
                </div>);
            } else if (field !== "last_name")
                return RenderInput(field, idx);
        })}
        {handleForgotPassword && <div className={"relative mb-4" + (errors["password-signin"] ? " pt-3" : "")}>
            <SmallButton className="absolute bottom-1" onClick={handleForgotPassword}>{t("forgotPassword")}</SmallButton>
        </div>}
        <Button onClick={onSubmit} disabled={disableBtn} className={formType === "reset-password" ? "w-full" : ""}>{t("submit")}</Button>
    </form>)
}
