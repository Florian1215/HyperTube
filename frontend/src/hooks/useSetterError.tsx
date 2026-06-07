import {useCallback} from "react";

export const useSetterError = (setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>, setDisableBtn: React.Dispatch<React.SetStateAction<boolean>>) => {
    return useCallback((value: Record<string, string>) => {
        setErrors((prevErrors) => {
            const newErrors = {...prevErrors, ...value};
            setDisableBtn(Object.keys(newErrors).length > 0 && Object.values(newErrors).some((v) => !!v));
            return newErrors;
        });
    }, [setErrors, setDisableBtn]);
};
