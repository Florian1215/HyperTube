import {iSeason} from "@/types/serie";
import useApiQuery from "@/hooks/useApiQuery";
import apiClient from "@/services/apiClient";

export function useSeason(serieId: string, seasonNumber: number) {
    return useApiQuery(
        ["series", serieId, "season", seasonNumber],
        (locale) => apiClient<iSeason>(`series/${serieId}/season/${seasonNumber}/`, locale)
    );
}
