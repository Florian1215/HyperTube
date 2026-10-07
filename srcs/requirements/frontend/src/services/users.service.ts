import {iUser} from "@/types/user";
import useApiQuery from "@/hooks/useApiQuery";
import {tListResponse} from "@/types/api";
import apiClient from "@/services/apiClient";
import {iMedia} from "@/types/media";
import {useDebounce} from "use-debounce";

export function getUser(locale: string, userId: string) {
    return apiClient<iUser>(`users/${userId}/`, locale);
}

export function followUser(locale: string, userId: number, follow: boolean) {
    return apiClient<iUser>(`users/${userId}/follow/`, locale, {method: follow ? "POST" : "DELETE"});
}

export function useUser(userId: string, enabled=true, viewerId?: number) {
    return useApiQuery(
        ["user", userId, viewerId],
        (locale: string) => getUser(locale, userId),
        enabled
    );
}

export function useUsersSearch(search: string, enabled = true, viewerId?: number) {
    const [debouncedQuery] = useDebounce(search, 200);

    return useApiQuery(
        ["users", debouncedQuery, viewerId],
        (locale, signal) => apiClient<tListResponse<iUser>>(`users/?search=${encodeURIComponent(debouncedQuery)}`, locale, {signal}),
        enabled
    );
}

export function useUserHistory(userId?: number) {
    return useApiQuery(
        ["user-media-history", userId],
        (locale: string) => apiClient<tListResponse<iMedia>>(`users/${userId}/history/`, locale),
        !!userId
    );
}

export function patchUser(locale: string, data: string[], userId?: number | string) {
    const updateData: Record<string, string> = {};

    if (data.length === 2) {
        updateData[data[0]] = data[1];
    } else {
        ["username"].forEach((field, index) => {
            const newValue = data[index].trim();
            if (newValue)
                updateData[field] = newValue;
        })
    }
    return apiClient<iUser>(`users/${userId}/`, locale, {method: "PATCH", body: JSON.stringify(updateData)});
}

export function postNewPassword(locale: string, data: string[]) {
    return apiClient(`users/new-password/`, locale, {method: "PATCH", body: JSON.stringify({current_password: data[0], new_password: data[1], new_password_confirm: data[2]})});
}

export function deleteUser(locale: string, userId: number) {
    return apiClient<void>(`users/${userId}/`, locale, {method: "DELETE"});
}
