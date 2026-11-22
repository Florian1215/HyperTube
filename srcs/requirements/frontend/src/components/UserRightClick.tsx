"use client";

import React, {useState} from "react";
import {useTranslations} from "next-intl";
import useAuth from "@/contexts/AuthContext";
import {iUser} from "@/types/user";
import {iAxe} from "@/types/utils";
import {BlockIcon} from "@/components/Icons";
import {MenuAction, useCloseContextMenu} from "@/components/MediaRightClick";
import useBlockUser from "@/hooks/useBlockUser";

function UserRightClick({user, contextMenu, setContextMenu}: {user: iUser, contextMenu?: iAxe, setContextMenu: (val?: iAxe) => void}) {
    const t = useTranslations("profile");
    const toggleBlock = useBlockUser();

    useCloseContextMenu(setContextMenu);

    if (!contextMenu)
        return null;
    return (<div className="fixed z-50 overflow-hidden custom-shadow-m bg-dwhite p-1 border rounded-sm" style={{left: contextMenu.x, top: contextMenu.y}}
                 onClick={(e) => e.stopPropagation()}
                 onPointerDown={(e) => e.stopPropagation()}>
        <MenuAction Icon={({size}: {size: number}) => <BlockIcon size={size} color={user.is_blocked ? "dblack" : "red"}/>} onClick={() => {
            setContextMenu(undefined);
            void toggleBlock(user);
        }}>
            <span className={user.is_blocked ? "" : "text-red"}>{t(user.is_blocked ? "unblock" : "block", {username: user.username})}</span>
        </MenuAction>
    </div>);
}

/** Right click on a user: block or unblock them. Nothing on oneself or when logged out. */
export function useUserRightClick(user?: iUser) {
    const {user: authUser} = useAuth();
    const [contextMenu, setContextMenu] = useState<iAxe>();
    const enabled = !!authUser && !!user && authUser.id !== user.id;

    const onContextMenu = (e: React.MouseEvent) => {
        if (!enabled)
            return;
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({x: e.clientX, y: e.clientY});
    };

    const menu = enabled ? <UserRightClick user={user} contextMenu={contextMenu} setContextMenu={setContextMenu}/> : null;
    return {onContextMenu, menu};
}

/** Gives the user right click menu to everything inside, without changing the layout. */
export function UserContextMenu({user, children}: {user?: iUser, children: React.ReactNode}) {
    const {onContextMenu, menu} = useUserRightClick(user);

    return (<div className="contents" onContextMenu={onContextMenu}>
        {children}
        {menu}
    </div>);
}
