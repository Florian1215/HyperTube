import {apiClient, tResponse} from "@/api/client";
import {iUser} from "@/types/user";
import {useApiQuery} from "@/hooks/useApiQuery";

function getUser(userId: string, locale: string) {
    return apiClient<tResponse<iUser>>(locale, `/users/${userId}`);
}

export function patchUser(locale: string, userId: number, data: Record<string, string>) {
    return apiClient<tResponse<iUser>>(`/users/${userId}`, locale, {method: "PATCH", body: JSON.stringify(data)});
}

export function postNewPassword(locale: string, userId: number, current_password: string, new_password: string, new_password_confirm: string) {
    return apiClient<tResponse<iUser>>(`/users/${userId}/new-password`, locale, {method: "PATCH", body: JSON.stringify({current_password, new_password, new_password_confirm})});
}

export function useUser(userId: string) {
    return useApiQuery(
        ["user", userId],
        (locale: string) => getUser(locale, userId),
    );
}

// todo make GET /users ?
