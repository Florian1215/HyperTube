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

export type tErrorResponse = {
    status: number;
    data: {
        error: {
            code: string
            message?: string
            fields?: Record<string, { message: string }>
        }
    }
};

export async function apiFetch<T>(endpoint: string, language?: string, options: RequestInit = {}): Promise<T> {
    if (language === undefined)
        language = "en";
    const token = localStorage.getItem("token");
    const response = await fetch(
        `${API_URL}${endpoint}`,
        {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(token && {
                    Authorization: `Bearer ${token}`,
                    "Accept-Language": language
                }),
                ...options.headers,
            },
        }
    );

    const data = await response.json().catch(() => null);
    if (!response.ok)
        throw {
            status: response.status,
            data: data,
        } satisfies tErrorResponse;
    return data;
}
