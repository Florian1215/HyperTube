import React, {useEffect, useLayoutEffect, useRef, useState} from "react";
import {useTranslations} from "next-intl";
import TextButton from "@/components/ui/Button/TextButton";

export default function ExpandableText({children, lines=3, className, showBtn=true}: {children: string, lines?: number, className?: string, showBtn?: boolean}) {
    const t = useTranslations("common");
    const [expanded, setExpanded] = useState(false);
    const [clamped, setClamped] = useState(true);
    const [overflowing, setOverflowing] = useState(false);
    const boxRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLParagraphElement>(null);
    const collapsedHeight = useRef(0);
    const animating = useRef(false);

    useEffect(() => {
        const text = textRef.current;
        if (!text || !clamped)
            return;
        const observer = new ResizeObserver(() => {
            collapsedHeight.current = text.getBoundingClientRect().height;
            setOverflowing(text.scrollHeight > text.clientHeight);
        });
        observer.observe(text);
        return () => observer.disconnect();
    }, [clamped, children]);

    const endAnimation = () => {
        if (!animating.current)
            return;
        animating.current = false;
        if (expanded && boxRef.current)
            boxRef.current.style.height = "";
        else
            setClamped(true);
    };

    useLayoutEffect(() => {
        if (clamped && boxRef.current)
            boxRef.current.style.height = "";
    }, [clamped]);

    useEffect(() => {
        const box = boxRef.current;
        const text = textRef.current;
        if (!box || !text || !animating.current)
            return;
        const frame = requestAnimationFrame(() => {
            const target = expanded ? text.scrollHeight : collapsedHeight.current;
            if (Math.abs(target - box.getBoundingClientRect().height) < 1 || getComputedStyle(box).transitionDuration === "0s")
                endAnimation();
            else
                box.style.height = `${target}px`;
        });
        return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expanded]);

    const toggle = () => {
        const box = boxRef.current;
        if (!box)
            return;
        box.style.height = `${box.getBoundingClientRect().height}px`;
        animating.current = true;
        setClamped(false);
        setExpanded(!expanded);
    };

    return (<div>
        <div ref={boxRef} className={"overflow-hidden transition-[height] duration-300 ease-in-out motion-reduce:transition-none " + (overflowing ? (expanded ? "hover:cursor-grab" : "hover:cursor-pointer") : "")} onClick={toggle}
             onTransitionEnd={(e) => e.target === boxRef.current && endAnimation()}>
            <p ref={textRef} className={className}
               style={clamped ? {display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: lines, overflow: "hidden"} : undefined}>
                {children}
            </p>
        </div>
        {overflowing && showBtn && <TextButton onClick={toggle} className="">{t(expanded ? "seeLess" : "seeMore")}</TextButton>}
    </div>);
}
