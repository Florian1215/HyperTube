export type tListResponse<T> = {
    results: T[];
    previous: string,
    next: string,
    count: number
    per_page: number
};
