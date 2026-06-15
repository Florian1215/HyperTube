import {iUser, iUserToken} from "@/types/user";
import useApiQuery from "@/hooks/useApiQuery";
import {tResponse} from "@/types/api";
import apiClient from "@/services/apiClient";
import {iMovie} from "@/types/movie";

function getUser(locale: string, userId: string) {
    return apiClient<tResponse<iUser>>(`/users/${userId}`, locale);
}

function getUserFilmHistory(locale: string, userId?: number) {
    return apiClient<tResponse<iMovie[]>>(`/users/${userId}/film-history`, locale);
}

export function patchUser(locale: string, data: string[], userId?: string) {
    const updateData: Record<string, string> = {};

    if (data.length === 2) {
        updateData[data[0]] = data[1];
    } else {
        if (data[0])
            updateData["email"] = data[0].trim();
        else if (data[1])
            updateData["first_name"] = data[1].trim();
        else if (data[2])
            updateData["last_name"] = data[2].trim();
        else if (data[3])
            updateData["username"] = data[3].trim();
    }
    return apiClient<tResponse<iUserToken>>(`/users/${userId}`, locale, {method: "PATCH", body: JSON.stringify(updateData)});
}

export function postNewPassword(locale: string, data: string[]) {
    return apiClient<tResponse<iUserToken>>(`/users/new-password`, locale, {method: "PATCH", body: JSON.stringify({current_password: data[0], new_password: data[1], new_password_confirm: data[2]})});
}

export function useUser(userId: string) {
    return useApiQuery(
        ["user", userId],
        (locale: string) => getUser(locale, userId),
    );
}

export function useUserFilmHistory(userId?: number) {
    return useApiQuery(
        ["user-film-history", String(userId)],
        (locale: string) => getUserFilmHistory(locale, userId),
        !!userId
    );
}
