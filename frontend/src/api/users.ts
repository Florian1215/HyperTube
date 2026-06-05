import {apiClient, tResponse} from "@/api/client";
import {iUser} from "@/types/user";
import {useApiQuery} from "@/hooks/useApiQuery";

function getUser(userId: string, locale: string) {
    return apiClient<tResponse<iUser>>(`/users/${userId}`, locale);
}

export function patchUser(locale: string, userId: string, data: BodyInit) {
    return apiClient<tResponse<iUser>>(`/users/${userId}`, locale, {method: "PATCH", body: data});
}

export function useUser(userId: string) {
    return useApiQuery(
        ["user", userId],
        (locale: string) => getUser(userId, locale),
    );
}

// todo make GET /users ?
