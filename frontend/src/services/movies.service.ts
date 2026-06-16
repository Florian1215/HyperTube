import {iMovie, iMovieDetails, iTorrent} from "@/types/movie";
import {useDebounce} from "use-debounce";
import useApiQuery from "@/hooks/useApiQuery";
import apiClient from "@/services/apiClient";
import {tListResponse, tResponse} from "@/types/api";

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

function getMovies(locale: string, search_title?: string, page?: number, signal?: AbortSignal) {
    let endpoint = "/movies";
    if (search_title === "directstream")
        endpoint += "/directstream"
    else if (search_title === "featured")
        endpoint += "/featured"
    else if (search_title === "watched")
        endpoint += "/watched"
    else if (search_title)
        endpoint += `/search?title=${search_title}&page=${page}`;
    return apiClient<tListResponse<iMovie[]>>(endpoint, locale, {signal});
}

export function useMovies(search_title?: string, page?: number, enabled = true) {
    const [debouncedQuery] = useDebounce(search_title ?? "", 200);

    return useApiQuery(
        ["movies", debouncedQuery, page?.toString() ?? "0"],
        (locale, signal) => getMovies(locale, debouncedQuery, page, signal),
        enabled
    );
}

function getTorrents(locale: string, movieId?: string) {
    return apiClient<tListResponse<iTorrent[]>>(`/movies/${movieId}/torrents`, locale);
}

export function useTorrents(movieId?: string, enabled=false) {
    return useApiQuery(
        ["torrents", movieId ?? ""],
        (locale) => getTorrents(locale, movieId),
        enabled && movieId !== undefined
    );
}

export function startStreamingTorrent(torrentId: string) { // todo handle local ?
    return apiClient<tListResponse<iTorrent>>(`/stream/${torrentId}`);
}
