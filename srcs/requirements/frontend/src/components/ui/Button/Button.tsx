import React from "react";

export type tButtonVariant = "primary" | "secondary" | "outline";

const VARIANTS: Record<tButtonVariant, {themed: string, fixed: string, disabled: string, disabledFixed: string}> = {
    primary: {
        themed: "text-dwhite bg-dblack hover:bg-dblack-light",
        fixed: "text-white bg-black hover:bg-black-light",
        disabled: "text-dwhite bg-gray",
        disabledFixed: "text-white bg-gray",
    },
    secondary: {
        themed: "text-dblack bg-dwhite hover:bg-dwhite-light",
        fixed: "text-black bg-white hover:bg-white-light",
        disabled: "text-gray bg-dwhite",
        disabledFixed: "text-gray bg-white",
    },
    outline: {
        themed: "text-dblack border border-dblack hover:bg-dblack/20",
        fixed: "text-white border border-white hover:bg-white/20",
        disabled: "text-gray border border-gray",
        disabledFixed: "text-gray border border-gray",
    },
};

export default function Button({children, onClick, onContextMenu, className, variant="primary", disabled=false, darkMode=true}: {children: React.ReactNode, onClick?: () => void, onContextMenu?: (e: React.MouseEvent) => void, className?: string, variant?: tButtonVariant, disabled?: boolean, darkMode?: boolean}) {
    const isDisabled = disabled || !onClick;
    const colors = VARIANTS[variant];
    const colorClass = isDisabled ? (darkMode ? colors.disabled : colors.disabledFixed) : (darkMode ? colors.themed : colors.fixed);

    return (<button
        disabled={isDisabled} onClick={onClick} onContextMenu={onContextMenu} type="button"
        className={`uppercase text-nowrap px-3 sm:px-5 h-8 sm:h-10 text-sm sm:text-base xl:text-lg ${colorClass} ${className ?? ""}`}>
        {children}
    </button>);
}
