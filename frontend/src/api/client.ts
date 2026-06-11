import {ApiError} from "@/api/errors";
import {postToken} from "@/api/auth";

type ApiOptions = RequestInit & {body?: unknown};
export const API_URL = "http://localhost:8080/api/v1";

export type tListResponse<T> = {
    data: T;
    meta?: {
        page: number;
        per_page: number;
        total: number;
    };
};

export type tResponse<T> = {
    data: T;
};

export async function apiClient<T>(endpoint: string, locale?: string, options?: ApiOptions): Promise<T> {
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
            body: options?.body
                ? options.body
                : undefined,
        }
    );

    const data = await response.json().catch(() => null);
    if (!response.ok) {
        if (response.status === 401 && data.error.code === "TOKEN_EXPIRED") {
            postToken(locale, localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")!).email : "", localStorage.getItem("password") || "").then((res) => {
                localStorage.setItem("token", res.access_token);
                apiClient(endpoint, locale, options).then((data) => {
                    return data;
                });
            });
        }
        throw new ApiError(response.status, data);
    }
    return data;
}
