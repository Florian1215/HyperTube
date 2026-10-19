import React, {useRef} from "react";

const HIDE_CURSOR = "motion-safe:cursor-none motion-safe:[&_*:not([class*=custom-cursor])]:cursor-none";
export default function HoverEffect({children, className = "", innerClassName = "", disabled = false, shift = 10, scale = 1.03, onHoverChange}: {children: React.ReactNode, className?: string, innerClassName?: string, disabled?: boolean, shift?: number, scale?: number, onHoverChange?: (hover: boolean) => void}) {
    const innerRef = useRef<HTMLDivElement>(null);

    const reset = () => {
        ["--hover-x", "--hover-y", "--pointer-x", "--pointer-y"].forEach((name) => innerRef.current?.style.removeProperty(name));
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const inner = innerRef.current;
        if (!inner || disabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
            return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        inner.style.setProperty("--hover-x", `${(x - 0.5) * shift}px`);
        inner.style.setProperty("--hover-y", `${(y - 0.5) * shift}px`);
        inner.style.setProperty("--pointer-x", `${x * 100}%`);
        inner.style.setProperty("--pointer-y", `${y * 100}%`);
    };

    const handlePointer = (hover: boolean) => (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === "mouse")
            onHoverChange?.(hover);
    };

    return (<div className={`group/hover ${disabled ? "" : HIDE_CURSOR} ${className}`} onMouseMove={handleMouseMove}
                 onMouseLeave={reset} onPointerEnter={handlePointer(true)} onPointerLeave={handlePointer(false)}>
        <div ref={innerRef} className={`absolute inset-0 ${disabled ? "" : "transition-transform duration-150 ease-out motion-reduce:transition-none motion-safe:group-hover/hover:[--hover-scale:var(--hover-scale-active)]"} ${innerClassName}`}
             style={disabled ? undefined : {transform: `translate(var(--hover-x, 0px), var(--hover-y, 0px)) scale(var(--hover-scale, 1))`, ["--hover-scale-active" as string]: scale}}>
            {children}
            {!disabled && <div className="absolute inset-0 pointer-events-none opacity-0 motion-safe:group-hover/hover:opacity-20 transition-opacity duration-150"
                               style={{background: "radial-gradient(circle at var(--pointer-x, 50%) var(--pointer-y, 50%), rgb(255 255 255 / 0.2), transparent 55%)"}}/>}
        </div>
    </div>);
}
