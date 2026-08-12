import apiClient from "@/services/apiClient";
import {iToken} from "@/types/user";

export function postLogin(locale: string, data: string[]) {
    return apiClient<iToken>("auth/login/", locale, {method: "POST", body: JSON.stringify({username: data[0].trim(), password: data[1]})});
}

export function postRegister(locale: string, data: string[]) {
    return apiClient<iToken>("users/", locale, {method: "POST", body: JSON.stringify({username: data[0].trim(), password: data[1]})});
}

let refreshPromise: Promise<void> | null = null;

export function refreshAccessToken(locale: string) {
    const refreshToken = localStorage.getItem("refresh");

    if (refreshPromise)
        return refreshPromise;

    if (!refreshToken)
        return Promise.reject(new Error("No refresh token"));

    if (refreshToken) {
        refreshPromise = apiClient<iToken>("auth/refresh/", locale, {method: "POST", body: JSON.stringify({refresh: refreshToken})})
            .then((res) => {
                if (res)
                    localStorage.setItem("access", res.access);
            }).finally(() => {
                refreshPromise = null;
            });
        return refreshPromise;
    }
}
