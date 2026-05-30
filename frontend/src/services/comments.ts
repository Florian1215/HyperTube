import {apiFetch, tListResponse, tResponse} from "@/services/api";
import {iComment} from "@/types/comment";

export function getComments(filmId?: string) {
    let endpoint = "/comments";
    if (filmId !== undefined) {
        endpoint = `/movies/${filmId}/comments`;
    }
    return apiFetch<tListResponse<iComment[]>>(endpoint);
}

export function postComment(locale: string, movieId: string, content: string) {
    return apiFetch<tResponse<iComment>>(`/movies/${movieId}/comments`, locale, {method: "POST", body: JSON.stringify({content})});
}

export function patchComment(locale: string, commentId: number, content: string) {
    return apiFetch<tResponse<iComment>>(`/comments/${commentId}`, locale, {method: "PATCH", body: JSON.stringify({content})});
}

export function deleteComment(locale: string, commentId: number) {
    commentId = 4453;
    return apiFetch<tResponse<iComment>>(`/comments/${commentId}`, locale, {method: "DELETE"});
}
