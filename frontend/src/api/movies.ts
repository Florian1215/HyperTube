import {apiClient, tListResponse, tResponse} from "@/api/client";
import {iMovie, iMovieDetails} from "@/types/movie";
import {useApiQuery} from "@/hooks/useApiQuery";

function getMovie(movieId: string, locale: string) {
    return apiClient<tResponse<iMovieDetails>>(`/movies/${movieId}`, locale);
}

export function useMovie(movieId: string, enabled = true) {
    return useApiQuery(
        ["movie", movieId],
        (locale) => getMovie(movieId, locale),
        enabled,
    );
}

function getMovies(locale: string, search_title?: string, page?: number) {
    let endpoint = "/movies";
    if (search_title === "directstream")
        endpoint += "/directstream"
    else if (search_title === "watched")
        endpoint += "/watched"
    else if (search_title)
        endpoint += `/search?title=${search_title}&page=${page}`;
    return apiClient<tListResponse<iMovie[]>>(endpoint, locale);
}

export function useMovies(search_title?: string, page?: number, enabled = true) {
    return useApiQuery(
        ["movies", search_title ? search_title : "", page ? String(page) : ""],
        (locale) => getMovies(locale, search_title, page),
        enabled
    );
}
