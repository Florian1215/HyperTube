import {useEffect, useState} from "react";
type tSize = "xs" | "md" | "xl";

export function useResponsiveSize() {
    const [size, setSize] = useState<tSize>("xl");

    useEffect(() => {
        function handleResize() {
            if (window.innerWidth >= 1024)
                setSize("xl");
            else if (window.innerWidth >= 768)
                setSize("md");
            else
                setSize("xs");
        }
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);
    return size;
}

export function hasError(error: Record<string, string>) {
    return Object.keys(error).length > 0 && Object.values(error).some((v) => !!v);
}

export function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, index: number,
                              fieldRefs: RefObject<HTMLInputElement[]>, submit: () => void,
                              setFocusedIndex: (newIdx:number) => void,
                              errors: Record<string, string>) {
    if (e.key !== "Enter")
        return ;
    e.preventDefault();
    const isLastField = index === fieldRefs.current.length - 1;
    if (isLastField) {
        if (hasError(errors)) {
            const errorsKey = Object.keys(errors);
            for (let i = 0; i < fieldRefs.current.length; i++) {
                if (errors[errorsKey[i]]) {
                    setFocusedIndex(i);
                    return ;
                }
            }
        }
        submit();
    }
    else
        setFocusedIndex(index + 1);
}

export function hasError(error: Record<string, string>) {
    return Object.keys(error).length > 0 && Object.values(error).some((v) => !!v);
}
