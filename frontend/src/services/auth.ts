import {API_URL, apiFetch, tResponse} from "@/services/api";
import {iUserToken} from "@/types/user";
import {tOauthService} from "@/components/OAuth";


export function postLogin(email: string, password: string) {
    return apiFetch<tResponse<iUserToken>>("/auth/login", undefined, {method: "POST", body: JSON.stringify({email, password})});
}

export function postRegister(email: string, username: string, firstname: string, lastname: string, password: string) {
    return apiFetch<tResponse<iUserToken>>("/auth/register", undefined, {method: "POST", body: JSON.stringify({email, username, firstname, lastname, password})});
}

export function handleOauth(oatuhCompany: tOauthService) {
    window.location.href = `${API_URL}/auth/${oatuhCompany}/login`;
}

// todo implement /api/v1/auth/password-reset

