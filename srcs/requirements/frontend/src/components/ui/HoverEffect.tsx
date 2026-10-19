import React from "react";

const HIDE_CURSOR = "motion-safe:cursor-none motion-safe:[&_*:not([class*=custom-cursor])]:cursor-none";
const WHITE_HIGHLIGHT = "rgb(255 255 255 / 0.2)";
export const CURRENT_COLOR_HIGHLIGHT = "color-mix(in srgb, currentColor 30%, transparent)";

interface iHoverOptions {
    disabled?: boolean
    shift?: number
    scale?: number
    highlightColor?: string
    onHoverChange?: (hover: boolean) => void
}

function getMovingElement(hovered: HTMLElement) {
    return hovered.matches("[data-hover-move]") ? hovered : hovered.querySelector<HTMLElement>(":scope > [data-hover-move]");
}

export function useHoverEffect({disabled = false, shift = 10, scale = 1.03, highlightColor = WHITE_HIGHLIGHT, onHoverChange}: iHoverOptions = {}) {
    const reset = (e: React.MouseEvent<HTMLElement>) => {
        const element = getMovingElement(e.currentTarget);
        ["--hover-x", "--hover-y", "--hover-scale", "--pointer-x", "--pointer-y"].forEach((name) => element?.style.removeProperty(name));
    };

    const onMouseMove = (e: React.MouseEvent<HTMLElement>) => {
        const element = getMovingElement(e.currentTarget);
        if (!element || disabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
            return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        element.style.setProperty("--hover-x", `${(x - 0.5) * shift}px`);
        element.style.setProperty("--hover-y", `${(y - 0.5) * shift}px`);
        element.style.setProperty("--hover-scale", `${scale}`);
        element.style.setProperty("--pointer-x", `${x * 100}%`);
        element.style.setProperty("--pointer-y", `${y * 100}%`);
    };

    const pointerHandler = (hover: boolean) => (e: React.PointerEvent<HTMLElement>) => {
        if (e.pointerType === "mouse")
            onHoverChange?.(hover);
    };

    return {
        handlers: {onMouseMove, onMouseLeave: reset, onPointerEnter: pointerHandler(true), onPointerLeave: pointerHandler(false)},
        hoverClassName: disabled ? "" : HIDE_CURSOR,
        moveClassName: disabled ? "" : "transition-transform duration-150 ease-out motion-reduce:transition-none",
        moveProps: {"data-hover-move": true, style: disabled ? undefined : {transform: "translate(calc(var(--hover-x, 0px) + var(--shadow-shift, 0px)), calc(var(--hover-y, 0px) + var(--shadow-shift, 0px))) scale(var(--hover-scale, 1))"}},
        highlight: disabled ? null : <span className="absolute inset-0 pointer-events-none opacity-0 motion-safe:group-hover/hover:opacity-20 transition-opacity duration-150"
                                           style={{background: `radial-gradient(circle at var(--pointer-x, 50%) var(--pointer-y, 50%), ${highlightColor}, transparent 55%)`}}/>,
    };
}

export default function HoverEffect({children, className = "", innerClassName = "", ...options}: {children: React.ReactNode, className?: string, innerClassName?: string} & iHoverOptions) {
    const hover = useHoverEffect(options);

    return (<div className={`group/hover ${hover.hoverClassName} ${className}`} {...hover.handlers}>
        <div {...hover.moveProps} className={`absolute inset-0 ${hover.moveClassName} ${innerClassName}`}>
            {children}
            {hover.highlight}
        </div>
    </div>);
}
