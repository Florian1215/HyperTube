import React, {useEffect, useState} from "react";

export default function IconButton({children, disabled, color="dblack", hoverColor, disabledColor, className, title, onClick}: {children: (color: string) => React.ReactNode, disabled?: boolean, color?: string, hoverColor?: string, disabledColor?: string, className?: string, title?: string, onClick?: () => void}) {
    const usedColor = (disabled && disabledColor) ? disabledColor : color;
    const [iconColor, setIconColor] = useState(usedColor);
    let usedHoverColor = hoverColor ?? "dblack-light";
    if (!hoverColor) {
        if (color === "dwhite")
            usedHoverColor = "dwhite-light";
        else if (color === "white")
            usedHoverColor = "white-light";
        else if (color === "black")
            usedHoverColor = "black-light";
        else if (color === "gray")
            usedHoverColor = "dblack";
        else if (color === "red")
            usedHoverColor = "red-hover";
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIconColor(usedColor);
    }, [usedColor]);

    return (<button type="button" disabled={disabled} title={title} onClick={onClick} className={className} onMouseEnter={() => {
        if (!disabled)
            setIconColor(usedHoverColor);
    }} onMouseLeave={() => setIconColor(usedColor)}>
        {children(iconColor)}
    </button>)
}
