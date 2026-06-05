import {API_URL, apiClient, tResponse} from "@/api/client";
import {iUserToken} from "@/types/user";
import {tOauthService} from "@/components/OAuth";

export function postLogin(locale: string, email: string, password: string) {
    return apiClient<tResponse<iUserToken>>("/auth/login", undefined, {method: "POST", body: JSON.stringify({email, password})});
}

export function postRegister(locale: string, email: string, username: string, firstname: string, lastname: string, password: string) {
    return apiClient<tResponse<iUserToken>>("/auth/register", locale, {method: "POST", body: JSON.stringify({email, username, firstname, lastname, password})});
}

export function handleOauth(oatuhCompany: tOauthService) {
    window.location.href = `${API_URL}/auth/${oatuhCompany}/login`;
}
