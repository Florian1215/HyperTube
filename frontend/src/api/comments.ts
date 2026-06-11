import {iComment} from "@/types/comment";
import {apiClient, tListResponse, tResponse} from "@/api/client";
import {useApiQuery} from "@/hooks/useApiQuery";

function getComments(filmId?: string, page?: number, locale?: string) {
    let endpoint = "/comments";
    if (filmId !== undefined && page !== undefined)
        endpoint = `/movies/${filmId}/comments?page=${page}`;
    return apiClient<tListResponse<iComment[]>>(endpoint, locale);
}

export function postComment(locale: string, movieId: string, content: string) {
    return apiClient<tResponse<iComment>>(`/movies/${movieId}/comments`, locale, {method: "POST", body: JSON.stringify({content})});
}

export function patchComment(locale: string, commentId: number, content: string) {
    return apiClient<tResponse<iComment>>(`/comments/${commentId}`, locale, {method: "PATCH", body: JSON.stringify({content})});
}

export function deleteComment(locale: string, commentId: number) {
    return apiClient<tResponse<iComment>>(`/comments/${commentId}`, locale, {method: "DELETE"});
}

export function useComments(filmId?: string, page?: number) {
    return useApiQuery(
        ["comments", filmId ? filmId : "", page ? String(page) : ""],
        (locale) => getComments(filmId, page, locale),
    );
}
