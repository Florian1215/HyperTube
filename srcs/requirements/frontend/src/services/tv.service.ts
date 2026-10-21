import {useQuery} from "@tanstack/react-query";
import {useLocale} from "next-intl";
import apiClient from "@/services/apiClient";
import {tMedia} from "@/types/utils";

const STATUS_INTERVAL_MS = 10_000;

export function useTvStatus(enabled = true) {
    const locale = useLocale();

    return useQuery({
        queryKey: ["tv-status", locale],
        queryFn: ({signal}) => apiClient<{online: boolean}>("tv/", locale, {signal}),
        enabled: enabled && !!locale,
        refetchInterval: STATUS_INTERVAL_MS,
        retry: false,
    });
}

export function castToTv(locale: string, type: tMedia, id: number | string, season?: number, episode?: number) {
    return apiClient<{status: string}>("tv/cast/", locale, {method: "POST", body: JSON.stringify({type, id: String(id), season, episode})});
}
