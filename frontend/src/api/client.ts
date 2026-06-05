import {ApiError} from "@/api/errors";

type ApiOptions = RequestInit & { body?: unknown; };
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
    if (!response.ok)
        throw new ApiError(response.status, data);
    return data;
}
