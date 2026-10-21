"use client";

import {useEffect} from "react";

const TAP_MS = 400;
const MOVE_TOLERANCE = 15;
const CLICK_GUARD_MS = 500;

type tTap = {target: EventTarget, start: number, points: Map<number, {x: number, y: number}>};

export default function TwoFingerContextMenu() {
    useEffect(() => {
        let tap: tTap | null = null;
        let multiTouch = false;
        let guardUntil = 0;

        const onStart = (e: TouchEvent) => {
            if (e.touches.length >= 2)
                multiTouch = true;
            if (e.touches.length === 2)
                tap = {target: e.touches[0].target, start: Date.now(), points: new Map([...e.touches].map((t) => [t.identifier, {x: t.clientX, y: t.clientY}]))};
            else
                tap = null;
        };
        const onMove = (e: TouchEvent) => {
            for (const touch of e.touches) {
                const start = tap?.points.get(touch.identifier);
                if (start && Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > MOVE_TOLERANCE)
                    tap = null;
            }
        };
        const onEnd = (e: TouchEvent) => {
            if (!multiTouch)
                return;
            if (e.cancelable)
                e.preventDefault();
            if (e.touches.length > 0)
                return;
            multiTouch = false;
            guardUntil = Date.now() + CLICK_GUARD_MS;
            if (!tap)
                return;
            const {target, start, points} = tap;
            tap = null;
            if (Date.now() - start > TAP_MS)
                return;
            const [a, b] = [...points.values()];
            target.dispatchEvent(new MouseEvent("contextmenu", {bubbles: true, cancelable: true, clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2}));
        };
        const onCancel = (e: TouchEvent) => {
            tap = null;
            if (e.touches.length === 0)
                multiTouch = false;
        };
        const onClick = (e: MouseEvent) => {
            if (!multiTouch && Date.now() > guardUntil)
                return;
            e.preventDefault();
            e.stopPropagation();
        };

        document.addEventListener("touchstart", onStart, {passive: true});
        document.addEventListener("touchmove", onMove, {passive: true});
        document.addEventListener("touchend", onEnd, {passive: false});
        document.addEventListener("touchcancel", onCancel);
        window.addEventListener("click", onClick, true);
        return () => {
            document.removeEventListener("touchstart", onStart);
            document.removeEventListener("touchmove", onMove);
            document.removeEventListener("touchend", onEnd);
            document.removeEventListener("touchcancel", onCancel);
            window.removeEventListener("click", onClick, true);
        };
    }, []);

    return null;
}
