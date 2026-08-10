export type tListResponse<T> = {
    results: T[];
    previous: string,
    next: string,
    count: number
    per_page: number
};

export interface iApplication {
    id: number,
    name: string,
    redirect_uri: string
    client_id: string,
    client_secret: string,
    created_at: string,
    updated_at: string
}
