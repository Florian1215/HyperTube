import React, {useEffect} from "react";
import {deleteMovieProgress, syncMovieProgress, updateMovieProgress} from "@/services/movies.service";
import {iMovie, iMovieDetails, iProgress} from "@/types/movie";
import {ApiError} from "@/services/apiClient";
import useNotification from "@/contexts/NotificationContext";
import {useTranslations} from "next-intl";
import {useQueryClient} from "@tanstack/react-query";
import {iUser} from "@/types/user";
import {EyeIcon, TrashIcon} from "@/components/Icons";
import {iAxe} from "@/types/utils";


export default function MovieRightClick({user, movie, contextMenu, setContextMenu}: {user: iUser, movie: iMovie, contextMenu?: iAxe, setContextMenu: (val?: iAxe) => void}) {
    const {addNotification} = useNotification();
    const t = useTranslations("movie");
    const tError = useTranslations("notifications.error");
    const queryClient = useQueryClient();

    useEffect(() => {
        const closeMenu = () => setContextMenu(undefined);

        const handleKeyDown = (ev: KeyboardEvent) => {
            if (ev.key === "Escape") {
                setContextMenu(undefined);
            }
        };

        document.addEventListener("click", closeMenu);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("click", closeMenu);
            document.removeEventListener("keydown", handleKeyDown);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleAction = async (action: () => Promise<iProgress>) => {
        try {
            const data = await action();
            syncMovieProgress(queryClient, user.id, movie as iMovieDetails, data);
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
            <MenuAction Icon={EyeIcon} onClick={() => handleAction(() => updateMovieProgress(movie?.id, 0, 100, true))}>{t("setAsWatched")}</MenuAction>
            <MenuAction Icon={TrashIcon} onClick={() => handleAction(() => deleteMovieProgress(movie?.id))}>{t("clearProgression")}</MenuAction>
        </div>);
    return null;
}

function MenuAction({children, onClick, Icon}: {children: React.ReactNode, onClick: () => void, Icon?: React.ElementType}) {
    return (<button onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
    }} className="flex items-center gap-2 w-full pl-3 pr-6 py-2 text-left text-sm transition hover:bg-white-loading">
        {Icon && <Icon size={20}/>}
        {children}
    </button>)
}
