import React, {useState} from "react";
import {EyeIcon} from "@/components/Icons";
import {useTranslations} from "next-intl";

export default function Input(
    {id, type, placeholder, value, onChange, idx, className, requestErrorMessage, setErrorsMessage, ref, onKeyDown}:
    {id: string, type: string, placeholder: string, value: string, onChange: React.Dispatch<React.SetStateAction<string[]>>, idx: number, className?: string, requestErrorMessage?: string, setErrorsMessage?: (errorMsg: Record<string, string>) => void, ref?: (el: HTMLInputElement) => void, onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void}
) {
    const isPassword = type === "password";
    const t = useTranslations("validationErrors");
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    const emailRegex = /^(?=.{1,64}@)(?!.*\.\.)([a-zA-Z0-9_+-]+(?:\.[a-zA-Z0-9_+-]+)*)@(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;

    const handleTogglePasswordVisibility = () => {
        setIsPasswordVisible(!isPasswordVisible);
    }

    const handleFieldVerification = (e: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) => {
        const newValue = e.target.value;

        if (setErrorsMessage) {
            let message = "";

            if (id.includes("email")) {
                if (newValue && !emailRegex.test(newValue.trim()))
                    message = t("emailInvalid");
            } else if (id.includes("first_name")) {
                if (newValue.trim().length > 30)
                    message = t("firstnameTooLong");
            } else if (id.includes("last_name")) {
                if (newValue.trim().length > 30)
                    message = t("lastnameTooLong");
            } else if (id.includes("username")) {
                if (newValue && newValue.trim().length < 3)
                    message = t("usernameTooShort");
                else if (newValue.trim().length > 32)
                    message = t("usernameTooLong");
                else if (newValue && !usernameRegex.test(newValue))
                    message = t("usernameInvalid");
            } else if (id.includes("password")) {
                if (newValue && newValue.length < 8)
                    message = t("passwordTooShort");
                else if (newValue.length > 72)
                    message = t("passwordTooLong");
            }
            setErrorsMessage({[id]: message});
        }
        onChange((prev) => {
            const updated = [...prev];
            updated[idx] = newValue;
            return updated;
        });
    }

    return (<div className={"flex flex-col w-full h-16 relative " + className}>
        <input id={id} type={isPasswordVisible && isPassword ? "text" : type} placeholder=""
               value={value} onChange={handleFieldVerification} onKeyDown={onKeyDown} ref={ref}
               className={"peer py-4 m-0 w-full h-8 bg-white  border-b focus:border-b-2 " + (requestErrorMessage ? "border-b-red text-red" : "text-black")}
        />
        <label htmlFor={id}
               className={"pointer-events-none uppercase absolute text-xs font-sans bottom-15\
                   peer-focus:text-xs peer-focus:font-sans peer-focus:bottom-15\
                   peer-placeholder-shown:font-condensed peer-placeholder-shown:tracking-wide peer-placeholder-shown:bottom-9 peer-placeholder-shown:text-2xl" + (requestErrorMessage ? " text-red" : "")}>{placeholder}</label>
        {isPassword && (<button className="absolute right-0 top-1" onClick={handleTogglePasswordVisibility}><EyeIcon crossed={isPasswordVisible} color={requestErrorMessage ? "red" : "black"}/></button>)}
        {requestErrorMessage && <span className="text-xs text-red">{requestErrorMessage}</span>}
    </div>
    );
}
