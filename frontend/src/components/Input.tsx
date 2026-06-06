import React, {useState} from "react";
import {EyeIcon} from "@/components/Icons";
import {useTranslations} from "next-intl";

export default function Input({id, type, placeholder, value, onChange, className, requestErrorMessage, setErrorsMessage, ref}: {id: string, type: string, placeholder: string, value: string, onChange: (value: string) => void, className?: string, requestErrorMessage?: string, setErrorsMessage?: any, ref?: any}) {
    const isPassword = type === "password";
    const t = useTranslations("validationErrors");
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    const emailRegex = /^(?=.{1,64}@)(?!.*\.\.)([a-zA-Z0-9_+-]+(?:\.[a-zA-Z0-9_+-]+)*)@(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;

    const handleTogglePasswordVisibility = () => {
        setIsPasswordVisible(!isPasswordVisible);
    }

    const handleFieldVerification = (e: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) => {
        const newValue = e.target.value; // todo faire verification required
        // todo add translation

        if (setErrorsMessage) {
            if (id.includes("email")) {
                if (!emailRegex.test(newValue.trim()))
                    setErrorsMessage({"email": t("emailInvalid")});
                else
                    setErrorsMessage({"email": ""});
            } else if (id.includes("firstname")) {
                if (newValue.trim().length > 100)
                    setErrorsMessage({"firstname": t("firstnameTooLong")});
                else
                    setErrorsMessage({"firstname": ""});
            } else if (id.includes("lastname")) {
                if (newValue.trim().length > 100)
                    setErrorsMessage({"lastname": t("lastnameTooLong")});
                else
                    setErrorsMessage({"lastname": ""});
            } else if (id.includes("username")) {
                if (newValue.trim().length < 3)
                    setErrorsMessage({"username": t("usernameTooShort")});
                else if (newValue.trim().length > 32)
                    setErrorsMessage({"username": t("usernameTooLong")});
                else if (!usernameRegex.test(newValue))
                    setErrorsMessage({"username": t("usernameInvalid")});
                else
                    setErrorsMessage({"username": ""});
            } else if (id.includes("password")) {
                if (newValue.length < 8)
                    setErrorsMessage({"password": t("passwordTooShort")});
                else if (newValue.length > 72)
                    setErrorsMessage({"password": t("passwordTooLong")});
                else
                    setErrorsMessage({"password": ""});
            } else
                setErrorsMessage({"login": ""});
        }
        onChange(newValue);
    }

    return (<div className={"flex flex-col w-full h-16 relative " + className}>
        <input id={id} ref={ref} type={isPasswordVisible && isPassword ? "text" : type} placeholder=""
               value={value}
               onChange={handleFieldVerification}
               className={"peer py-4 m-0 w-full h-8 bg-white  border-b focus:border-b-2 " + (requestErrorMessage ? "border-b-red text-red" : "text-black")}/>
        <label htmlFor={id}
               className={"pointer-events-none uppercase absolute text-xs font-sans bottom-15\
                   peer-focus:text-xs peer-focus:font-sans peer-focus:bottom-15\
                   peer-placeholder-shown:font-condensed peer-placeholder-shown:tracking-wide peer-placeholder-shown:bottom-9 peer-placeholder-shown:text-2xl" + (requestErrorMessage ? " text-red" : "")}>{placeholder}</label>
        {isPassword && (<button className="absolute right-0 top-1" onClick={handleTogglePasswordVisibility}><EyeIcon crossed={isPasswordVisible} color={requestErrorMessage ? "red" : "black"}/></button>)}
        {requestErrorMessage && <span className="text-xs text-red">{requestErrorMessage}</span>}
    </div>
    );
}
