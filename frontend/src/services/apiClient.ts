import {refreshToken} from "@/services/auth.service";
import {ApiError} from "@/services/ApiError";

type ApiOptions = RequestInit & {body?: unknown};
export const API_URL = "http://localhost:8080/api/v1";

export default async function apiClient<T>(endpoint: string, locale?: string, options?: ApiOptions): Promise<T> {
    const token = localStorage.getItem("token");
    console.log("USE TOKEN", token);
    if (!locale)
        locale = "en";

    const response = await fetch(
        `${API_URL}${endpoint}`,
        {
            ...options,
            headers: {
                "Content-Type": "application/json",
                "Accept-Language": locale,
                ...(token && {
                    Authorization: `Bearer ${token}`,
                }),
            },
            body: options?.body,
            signal: options?.signal,
        }
    );

    const data = await response.json().catch(() => null);
    console.log(options?.method || "GET", endpoint, response.status, "=>", data);
    if (!response.ok) {
        if (response.status === 401 && data.error.code === "TOKEN_EXPIRED") {
            const refresh_token = localStorage.getItem("refresh_token");
            if (refresh_token) {
                console.warn("TOKEN EXPIRED");
                return refreshToken(locale, refresh_token).then((res) => {
                    console.warn("GET NEW TOKEN, RETRY REQUEST w/", res.data.access_token);
                    localStorage.setItem("token", res.data.access_token);
                    return apiClient<T>(endpoint, locale, options);
                });
            }
        }
        throw new ApiError(response.status, data);
    } else
        return data;
}
