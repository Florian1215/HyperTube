import React, {useRef} from "react";
import {iAxe} from "@/types/utils";

const LONG_PRESS_MS = 500;
const DOUBLE_TAP_MS = 300;
const MOVE_TOLERANCE = 10;
const DOUBLE_TAP_TOLERANCE = 40;
const TOUCH_CLICK_MS = 1000;

export const CONTEXT_MENU_POPUP = "data-context-menu-popup";

export type tContextMenuProps = {
    "data-context-menu"?: ""
    draggable?: false
    onContextMenu?: (e: React.MouseEvent) => void
    onTouchStart?: (e: React.TouchEvent) => void
    onTouchMove?: (e: React.TouchEvent) => void
    onTouchEnd?: () => void
    onTouchCancel?: () => void
    onClickCapture?: (e: React.MouseEvent) => void
    onDoubleClickCapture?: (e: React.MouseEvent) => void
};

const inPopup = (target: EventTarget) => target instanceof Element && target.closest(`[${CONTEXT_MENU_POPUP}]`) !== null;

export default function useContextMenu(open: (position: iAxe) => void, enabled = true): tContextMenuProps {
    const timer = useRef<number | undefined>(undefined);
    const start = useRef<iAxe | null>(null);
    const fired = useRef(false);
    const lastTouch = useRef(0);
    const pendingTap = useRef<iAxe & {timer: number} | null>(null);
    const replaying = useRef(false);

    if (!enabled)
        return {};

    const fire = (position: iAxe) => {
        window.clearTimeout(timer.current);
        start.current = null;
        fired.current = true;
        navigator.vibrate?.(10);
        open(position);
    };
    const cancel = () => {
        window.clearTimeout(timer.current);
        start.current = null;
    };

    return {
        "data-context-menu": "",
        draggable: false,
        onContextMenu: (e) => {
            e.preventDefault();
            if (start.current)
                fire(start.current);
            else if (!fired.current)
                open({x: e.clientX, y: e.clientY});
        },
        onTouchStart: (e) => {
            fired.current = false;
            cancel();
            if (e.touches.length !== 1 || inPopup(e.target))
                return;
            lastTouch.current = Date.now();
            const position = {x: e.touches[0].clientX, y: e.touches[0].clientY};
            start.current = position;
            timer.current = window.setTimeout(() => fire(position), LONG_PRESS_MS);
        },
        onTouchMove: (e) => {
            const touch = e.touches[0];
            if (start.current && touch && Math.hypot(touch.clientX - start.current.x, touch.clientY - start.current.y) > MOVE_TOLERANCE)
                cancel();
        },
        onTouchEnd: cancel,
        onTouchCancel: cancel,
        onClickCapture: (e) => {
            if (fired.current) {
                fired.current = false;
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            if (replaying.current || inPopup(e.target) || Date.now() - lastTouch.current > TOUCH_CLICK_MS)
                return;

            e.preventDefault();
            e.stopPropagation();
            const position = {x: e.clientX, y: e.clientY};
            const pending = pendingTap.current;
            window.clearTimeout(pending?.timer);
            if (pending && Math.hypot(position.x - pending.x, position.y - pending.y) < DOUBLE_TAP_TOLERANCE) {
                pendingTap.current = null;
                navigator.vibrate?.(10);
                open(position);
                return;
            }
            const target = e.target;
            pendingTap.current = {...position, timer: window.setTimeout(() => {
                pendingTap.current = null;
                replaying.current = true;
                target.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true, clientX: position.x, clientY: position.y}));
                replaying.current = false;
            }, DOUBLE_TAP_MS)};
        },
        onDoubleClickCapture: (e) => {
            const pending = pendingTap.current;
            if (!pending)
                return;
            e.preventDefault();
            e.stopPropagation();
            window.clearTimeout(pending.timer);
            pendingTap.current = null;
            navigator.vibrate?.(10);
            open({x: e.clientX, y: e.clientY});
        },
    };
}
