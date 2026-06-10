import {API_URL, apiClient, tResponse} from "@/api/client";
import {iUserToken} from "@/types/user";
import {tOauthService} from "@/components/Form";

export function postLogin(locale: string, data: string[]) {
    return apiClient<tResponse<iUserToken>>("/auth/login", locale, {method: "POST", body: JSON.stringify({login: data[0].trim(), password: data[1]})});
}

export function postRegister(locale: string, data: string[]) {
    return apiClient<tResponse<iUserToken>>("/auth/register", locale, {method: "POST", body: JSON.stringify({email: data[0].trim(), first_name: data[1].trim(), last_name: data[2].trim(), username: data[3].trim(), password: data[4]})});
}

export function postResetPassword(locale: string, data: string[]) {
    return apiClient<tResponse<iUserToken>>("/auth/password-reset", locale, {method: "POST", body: JSON.stringify({email: data[0].trim()})});
}

export function handleOauth(oatuhCompany: tOauthService) {
    window.location.href = `${API_URL}/auth/${oatuhCompany}/login`;
}
