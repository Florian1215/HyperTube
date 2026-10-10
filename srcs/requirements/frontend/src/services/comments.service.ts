import useApiQuery, {addQuery, removeQuery} from "@/hooks/useApiQuery";
import apiClient from "@/services/apiClient";
import {tListResponse} from "@/types/api";
import {iComment, iCommentDetails} from "@/types/comment";
import {QueryClient} from "@tanstack/react-query";
import {iMedia} from "@/types/media";
import {tMedia} from "@/types/utils";

export function useComments(mediaType: tMedia, mediaId?: string, page?: number) {
    return useApiQuery(
        ["comments", mediaType, mediaId, page],
        (locale) => {
            let endpoint = `comments/${mediaType}/`;

            if (mediaId !== undefined && page !== undefined)
                endpoint = `${mediaType}/${mediaId}/comments/?ordering=-updated_at&page=${page}`;
            return apiClient<tListResponse<iComment>>(endpoint, locale);
        },
    );
}

export function useProfileComments(userId: number, page: number) {
    return useApiQuery(
        ["user-comments", userId, page],
        (locale) => apiClient<tListResponse<iCommentDetails>>(`users/${userId}/comments/?ordering=-updated_at&page=${page}`, locale),
    );
}

export function postComment(locale: string, mediaType: tMedia, mediaId: string, content: string) {
    return apiClient<iComment>(`${mediaType}/${mediaId}/comments/`, locale, {method: "POST", body: JSON.stringify({content})});
}

export function patchComment(locale: string, commentId: number, content: string) {
    return apiClient<iComment>(`comments/${commentId}/`, locale, {method: "PATCH", body: JSON.stringify({content})});
}

export function deleteComment(locale: string, commentId: number) {
    return apiClient<iComment>(`comments/${commentId}/`, locale, {method: "DELETE"});
}

export function addCommentCache(queryClient: QueryClient, newComment: iComment, media: iMedia, userId: number) {
    addQuery(queryClient, ["comments", media.type, media.id, 1], newComment);
    const newDetailComment = structuredClone(newComment as iCommentDetails);
    newDetailComment.media = media;
    addQuery(queryClient, ["user-comments", userId, 1], newDetailComment);
}

export function updateCommentCache(queryClient: QueryClient, comment: iComment) {
    ["comments", "user-comments"].forEach((key) => {
        queryClient.setQueriesData<tListResponse<iComment>>({queryKey: [key]}, (current) => {
            if (!current?.results)
                return current;
            return {...current, results: current.results.map((v) => v.id === comment.id ? {...v, ...comment} : v)};
        });
        void queryClient.invalidateQueries({queryKey: [key]});
    });
}

export function removeCommentCache(queryClient: QueryClient, commentId: number, userId: number) {
    removeQuery(queryClient, ["comments"], commentId);
    removeQuery(queryClient, ["user-comments", userId, 1], commentId);
}
