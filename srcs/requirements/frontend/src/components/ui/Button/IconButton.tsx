import React from "react";

export type tIconColor = "dblack" | "dwhite" | "black" | "white" | "gray" | "red";
export type tIconHoverColor = tIconColor | "accent" | "dblack-light" | "dwhite-light" | "black-light" | "white-light" | "red-hover";

const colorClassNames: Record<tIconColor, string> = {
    dblack: "text-dblack",
    dwhite: "text-dwhite",
    black: "text-black",
    white: "text-white",
    gray: "text-gray",
    red: "text-red",
};

const disabledClassNames: Record<tIconColor, string> = {
    dblack: "disabled:text-dblack",
    dwhite: "disabled:text-dwhite",
    black: "disabled:text-black",
    white: "disabled:text-white",
    gray: "disabled:text-gray",
    red: "disabled:text-red",
};

const hoverClassNames: Record<tIconHoverColor, string> = {
    accent: "enabled:hover:text-accent",
    dblack: "enabled:hover:text-dblack",
    dwhite: "enabled:hover:text-dwhite",
    black: "enabled:hover:text-black",
    white: "enabled:hover:text-white",
    gray: "enabled:hover:text-gray",
    red: "enabled:hover:text-red",
    "dblack-light": "enabled:hover:text-dblack-light",
    "dwhite-light": "enabled:hover:text-dwhite-light",
    "black-light": "enabled:hover:text-black-light",
    "white-light": "enabled:hover:text-white-light",
    "red-hover": "enabled:hover:text-red-hover",
};

const defaultHoverColors: Record<tIconColor, tIconHoverColor> = {
    dblack: "dblack-light",
    dwhite: "dwhite-light",
    black: "black-light",
    white: "white-light",
    gray: "dblack",
    red: "red-hover",
};

export default function IconButton({children, disabled, color="dblack", hoverColor, disabledColor, className="", title, role, onClick, accent=false}: {children: React.ReactNode, disabled?: boolean, color?: tIconColor, hoverColor?: tIconHoverColor, disabledColor?: tIconColor, className?: string, title?: string, role?: string, onClick?: () => void, accent?: boolean}) {
    const usedHoverColor = accent ? "accent" : hoverColor ?? defaultHoverColors[color];

    return (<button type="button" disabled={disabled} title={title} role={role} onClick={onClick}
                    className={`group ${colorClassNames[color]} ${hoverClassNames[usedHoverColor]} ${disabledColor ? disabledClassNames[disabledColor] : ""} ${className}`}>
        {children}
    </button>)
}
