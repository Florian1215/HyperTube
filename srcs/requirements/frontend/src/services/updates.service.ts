import apiClient from "@/services/apiClient";
import useApiQuery from "@/hooks/useApiQuery";
import {iUpdate} from "@/types/update";

export function useCurrentUpdate() {
    return useApiQuery(
        ["updates", "current"],
        (locale: string) => apiClient<{update: iUpdate | null}>("updates/current/", locale),
    );
}
