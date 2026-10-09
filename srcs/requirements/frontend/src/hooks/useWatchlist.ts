import {useQueryClient} from "@tanstack/react-query";
import {useTranslations} from "next-intl";
import useNotification from "@/contexts/NotificationContext";
import {ApiError} from "@/services/apiClient";
import {syncMediaWatchlist, updateMediaWatchlist} from "@/services/medias.service";
import {iMedia} from "@/types/media";

export default function useWatchlist() {
    const queryClient = useQueryClient();
    const {addNotification} = useNotification();
    const tError = useTranslations("notifications.error");

    return async (media: Pick<iMedia, "id" | "type" | "in_watchlist">) => {
        try {
            const res = await updateMediaWatchlist(media.id, media.type, !media.in_watchlist);
            syncMediaWatchlist(queryClient, media, res.in_watchlist);
        } catch (e) {
            addNotification(tError("failedChangeWatchlist", {error: e instanceof ApiError ? e.message : String(e)}), "error");
        }
    };
}
