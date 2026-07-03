import apiClient, {API_URL} from "@/services/apiClient";
import {tResponse} from "@/types/api";
import {iToken, iUserToken, tOauthService} from "@/types/user";

export function postLogin(locale: string, data: string[]) {
    return apiClient<tResponse<iUserToken>>("/auth/login", locale, {method: "POST", body: JSON.stringify({login: data[0].trim(), password: data[1]})});
}

export function postRegister(locale: string, data: string[]) {
    return apiClient<tResponse<iUserToken>>("/auth/register", locale, {method: "POST", body: JSON.stringify({email: data[0].trim(), first_name: data[1].trim(), last_name: data[2].trim(), username: data[3].trim(), password: data[4]})});
}

export function postResetPassword(locale: string, data: string[]) {
    return apiClient<tResponse<iUserToken>>("/auth/password-reset/send-email", locale, {method: "POST", body: JSON.stringify({email: data[0].trim()})});
}

export function postSetNewPassword(locale: string, data: string[], token?: string) {
    return apiClient<tResponse<iUserToken>>("/auth/password-reset/set-new-password", locale, {method: "POST", body: JSON.stringify({token: token, password: data[0]})});
}

export function handleOauth(oatuhCompany: tOauthService, redirect?: string) {
    let endpoint = `${API_URL}/auth/${oatuhCompany}/login`;

    if (redirect !== null)
        endpoint += `?redirect=${redirect}`;
    window.location.href = endpoint;
}

let refreshPromise: Promise<void> | null = null;

export function refreshAccessToken(locale: string) {
    const refresh_token = localStorage.getItem("refresh_token");

    if (refreshPromise)
        return refreshPromise;

    if (refresh_token) {
        refreshPromise = apiClient<tResponse<iToken>>("/auth/refresh-token", locale, {method: "POST", body: JSON.stringify({refresh_token: refresh_token})})
            .then((res) => {
                if (res)
                    localStorage.setItem("token", res.data.access_token);
                // localStorage.setItem("token", res.data.access_token);
            }).finally(() => {
                refreshPromise = null;
            });
        return refreshPromise;
    }
}
