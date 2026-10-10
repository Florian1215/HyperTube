import React, {useEffect, useState} from "react";
import useAuth from "@/contexts/AuthContext";
import {deleteMediaProgress, syncMediaProgress, updateMediaProgress} from "@/services/medias.service";
import {iMedia, iProgress} from "@/types/media";
import {ApiError} from "@/services/apiClient";
import useNotification from "@/contexts/NotificationContext";
import {useTranslations} from "next-intl";
import {useQueryClient} from "@tanstack/react-query";
import {iUser} from "@/types/user";
import {BookmarkIcon, EyeIcon, TrashIcon} from "@/components/Icons";
import {iAxe} from "@/types/utils";
import useWatchlist from "@/hooks/useWatchlist";


export default function MediaRightClick({user, media, contextMenu, setContextMenu, seasonNumber, episodeNumber, progress = media}: {user: iUser, media: iMedia, contextMenu?: iAxe, setContextMenu: (val?: iAxe) => void, seasonNumber?: number, episodeNumber?: number, progress?: Pick<iProgress, "complete" | "pourcent">}) {
    const {addNotification} = useNotification();
    const t = useTranslations("media");
    const tError = useTranslations("notifications.error");
    const queryClient = useQueryClient();
    const toggleWatchlist = useWatchlist();

    useEffect(() => {
        const closeMenu = () => setContextMenu(undefined);

        const handleKeyDown = (ev: KeyboardEvent) => {
            if (ev.key === "Escape") {
                setContextMenu(undefined);
            }
        };

        document.addEventListener("click", closeMenu);
        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("contextmenu", closeMenu, true);
        window.addEventListener("scroll", closeMenu, true);

        return () => {
            document.removeEventListener("click", closeMenu);
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("contextmenu", closeMenu, true);
            window.removeEventListener("scroll", closeMenu, true);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleAction = async (action: () => Promise<iProgress | null>) => {
        try {
            const data = await action();
            syncMediaProgress(queryClient, user.id, media, data ?? undefined, episodeNumber);
            setContextMenu(undefined);
        } catch (e) {
            addNotification(tError("failedChangeProgression", {error: e instanceof ApiError ? e.message : String(e)}), "error");
        }
    };

    if (contextMenu)
        return (<div className="fixed z-50 overflow-hidden custom-shadow-m bg-white p-1 border" style={{left: contextMenu.x, top: contextMenu.y}}
             onClick={(e) => e.stopPropagation()}
             onPointerDown={(e) => e.stopPropagation()}
        >
            <MenuAction Icon={({size}: {size: number}) => <BookmarkIcon size={size} filled={media.in_watchlist}/>} onClick={() => {
                setContextMenu(undefined);
                void toggleWatchlist(media);
            }}>{t(media.in_watchlist ? "removeFromWatchlist" : "addToWatchlist")}</MenuAction>
            {progress.complete ?
                <MenuAction Icon={(size: number) => <EyeIcon size={size} crossed={true}/>} onClick={() => handleAction(() => deleteMediaProgress(media?.id, media.type, seasonNumber, episodeNumber))}>{t("setAsNotWatched")}</MenuAction> :
                <MenuAction Icon={EyeIcon} onClick={() => handleAction(() => updateMediaProgress(media?.id, media.type, 0, 100, true, false, seasonNumber, episodeNumber))}>{t("setAsWatched")}</MenuAction>
            }
            {!progress.complete && progress.pourcent > 0 && progress.pourcent < 100 && <MenuAction Icon={TrashIcon} onClick={() => handleAction(() => deleteMediaProgress(media?.id, media.type, seasonNumber, episodeNumber))}>{t("clearProgression")}</MenuAction>}
        </div>);
    return null;
}

export function useMediaRightClick(media?: iMedia) {
    const {user} = useAuth();
    const [contextMenu, setContextMenu] = useState<iAxe>();

    const onContextMenu = (e: React.MouseEvent) => {
        if (!user || !media)
            return;
        e.preventDefault();
        setContextMenu({x: e.clientX, y: e.clientY});
    };

    const menu = user && media ? <MediaRightClick user={user} media={media} contextMenu={contextMenu} setContextMenu={setContextMenu}/> : null;
    return {onContextMenu, menu};
}

function MenuAction({children, onClick, Icon}: {children: React.ReactNode, onClick: () => void, Icon?: React.ElementType}) {
    return (<button onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
    }} className="flex items-center gap-2 w-full pl-3 pr-6 py-2 text-left text-sm transition hover:bg-white-light">
        {Icon && <Icon size={20}/>}
        {children}
    </button>)
}
