import {useQuery} from "@tanstack/react-query";
import {useLocale} from "next-intl";
import apiClient from "@/services/apiClient";
import {tMedia} from "@/types/utils";

/** Asked once per page load: if it fails, the TV option stays hidden until the page is reloaded. */
export function useTvStatus(enabled = true) {
    const locale = useLocale();

    return useQuery({
        queryKey: ["tv-status"],
        queryFn: ({signal}) => apiClient<{online: boolean}>("tv/", locale, {signal}),
        enabled: enabled && !!locale,
        staleTime: Infinity,
        gcTime: Infinity,
        retry: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
}

export function castToTv(locale: string, type: tMedia, id: number | string, season?: number, episode?: number) {
    return apiClient<{status: string}>("tv/cast/", locale, {method: "POST", body: JSON.stringify({type, id: String(id), season, episode})});
}
