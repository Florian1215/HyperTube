import React, {useCallback} from "react";
import {hasError} from "@/context/utils";

export const useSetterError = (setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>, setDisableBtn: React.Dispatch<React.SetStateAction<boolean>>) => {
    return useCallback((value: Record<string, string>) => {
        setErrors((prevErrors) => {
            const newErrors = {...prevErrors, ...value};
            setDisableBtn(hasError(newErrors));
            return newErrors;
        });
    }, [setErrors, setDisableBtn]);
};
