import {postToken} from "@/services/auth.service";
import {ApiError} from "@/services/ApiError";

type ApiOptions = RequestInit & {body?: unknown};
export const API_URL = "http://localhost:8080/api/v1";

export default async function apiClient<T>(endpoint: string, locale?: string, options?: ApiOptions): Promise<T> {
    const token = localStorage.getItem("token");
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
            const user = JSON.parse(localStorage.getItem("user")!);
            console.warn("TOKEN EXPIRED");
            return postToken(locale, user.email, "coucoucou").then((res) => {
                console.warn("GET NEW TOKEN, RETRY REQUEST");
                localStorage.setItem("token", res.access_token);
                return apiClient<T>(endpoint, locale, options);
            });
        } else
            throw new ApiError(response.status, data);
    } else
        return data;
}
