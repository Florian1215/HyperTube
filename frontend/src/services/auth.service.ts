import apiClient, {API_URL} from "@/services/apiClient";
import {tResponse} from "@/types/api";
import {iToken, iUserToken, tOauthService} from "@/types/user";

export function postLogin(locale: string, data: string[]) {
    localStorage.setItem("password", data[1]);
    return apiClient<tResponse<iUserToken>>("/auth/login", locale, {method: "POST", body: JSON.stringify({login: data[0].trim(), password: data[1]})});
}

export function postRegister(locale: string, data: string[]) {
    localStorage.setItem("password", data[4]);
    return apiClient<tResponse<iUserToken>>("/auth/register", locale, {method: "POST", body: JSON.stringify({email: data[0].trim(), first_name: data[1].trim(), last_name: data[2].trim(), username: data[3].trim(), password: data[4]})});
}

export function postResetPassword(locale: string, data: string[]) {
    return apiClient<tResponse<iUserToken>>("/auth/password-reset", locale, {method: "POST", body: JSON.stringify({email: data[0].trim()})});
}

export function postSetNewPassword(locale: string, data: string[], token?: string) {
    return apiClient<tResponse<iUserToken>>("/auth/reset-password", locale, {method: "POST", body: JSON.stringify({token: token, password: data[0]})});
}

export function postToken(locale: string, login: string, password: string) {
    return apiClient<iToken>("/oauth/token", locale, {method: "POST", body: JSON.stringify({username: login, password: password, grant_type: 'password'})});
}

export function handleOauth(oatuhCompany: tOauthService, redirect: string | null) {
    let endpoint = `${API_URL}/auth/${oatuhCompany}/login`;

    if (redirect !== null)
        endpoint += `?redirect=${redirect}`;
    window.location.href = endpoint;
}
