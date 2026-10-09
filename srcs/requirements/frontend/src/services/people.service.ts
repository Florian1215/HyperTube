import {useDebounce} from "use-debounce";
import useApiQuery from "@/hooks/useApiQuery";
import useAuth from "@/contexts/AuthContext";
import apiClient from "@/services/apiClient";
import {tListResponse} from "@/types/api";
import {iPeople, iPerson, tPersonMediasResponse, tPersonRole} from "@/types/media";

export function usePeopleSearch(search: string, enabled = true, page = 1) {
    const [debouncedQuery] = useDebounce(search, 200);
    const {user} = useAuth();

    return useApiQuery(
        ["people", debouncedQuery, page, user?.id],
        (locale, signal) => apiClient<tListResponse<iPeople>>(`people/?search=${encodeURIComponent(debouncedQuery)}&page=${page}`, locale, {signal}),
        enabled
    );
}

export function usePerson(personId: string) {
    const {user} = useAuth();

    return useApiQuery(
        ["person", personId, user?.id],
        (locale) => apiClient<iPerson>(`people/${personId}/`, locale)
    );
}

export function usePersonMedias(personId: string, role: tPersonRole, page = 1, viewerId?: number, enabled = true) {
    return useApiQuery(
        ["person", personId, "medias", role, page, viewerId],
        (locale) => apiClient<tPersonMediasResponse>(`people/${personId}/medias/?role=${role}&page=${page}`, locale),
        enabled
    );
}
