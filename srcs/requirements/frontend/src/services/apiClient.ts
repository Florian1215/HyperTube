import {refreshAccessToken} from "@/services/auth.service";

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
        if (data?.code === "token_not_valid" && endpoint !== 'auth/refresh/') {
            try {
                await refreshAccessToken(locale);
            } catch {
                throw new ApiError(response.status, data);
            }
            return apiClient<T>(endpoint, locale, options);
        }
        throw new ApiError(response.status, data);
    } else
        return data;
}

export class ApiError extends Error {
    status: number;
    data?: Record<string, string>;

    constructor(status: number, data?: Record<string, string>) {
        let unknownErrorMessage = "Unknown error";
        if (status === 401)
            unknownErrorMessage = "Unauthorized";
        else if (status === 403)
            unknownErrorMessage = "Forbidden";
        else if (status === 404)
            unknownErrorMessage = "Not found";
        super(`${status} - Error: ${data?.detail || data?.message || unknownErrorMessage}`);

        this.name = "ApiError";
        this.status = status;
        this.data = data;
    }
}
