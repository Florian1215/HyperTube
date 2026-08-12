import {refreshAccessToken} from "@/services/auth.service";
import {ApiError} from "@/services/ApiError";

type ApiOptions = RequestInit & {body?: unknown};
export const API_URL = "http://localhost:8439/api/v1/";

export default async function apiClient<T>(endpoint: string, locale?: string, options?: ApiOptions): Promise<T> {
    const token = localStorage.getItem("access");
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
    if (!response.ok) {
        if (response.status === 401 && data.code === "token_not_valid") {
            await refreshAccessToken(locale);
            return apiClient<T>(endpoint, locale, options);
        }
        throw new ApiError(response.status, data);
    } else
        return data;
}
