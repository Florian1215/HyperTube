import useApiQuery from "@/hooks/useApiQuery";
import apiClient from "@/services/apiClient";
import {tListResponse, tResponse} from "@/types/api";
import {iComment} from "@/types/comment";

function getComments(filmId?: string, page?: number, locale?: string) {
    let endpoint = "/comments";
    if (filmId !== undefined && page !== undefined)
        endpoint = `/movies/${filmId}/comments?page=${page}`;
    return apiClient<tListResponse<iComment[]>>(endpoint, locale);
}

function getUserComments(userId: number, page: number, locale: string) {
    return apiClient<tListResponse<iComment[]>>(`/users/${userId}/comments?page=${page}`, locale);
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
        ["comments", filmId ?? "", page?.toString() ?? "0"],
        (locale) => getComments(filmId, page, locale),
    );
}

export function useProfileComments(userId: number, page: number) {
    return useApiQuery(
        ["userComments", String(userId), String(page)],
        (locale) => getUserComments(userId, page, locale),
    );
}
