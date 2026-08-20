import {iMovie, iMovieDetails, iProgress, iTorrent} from "@/types/movie";
import {useDebounce} from "use-debounce";
import useApiQuery, {updateMovie, updateQuery} from "@/hooks/useApiQuery";
import apiClient from "@/services/apiClient";
import {tListResponse} from "@/types/api";
import {QueryClient} from "@tanstack/react-query";

function getMovie(movieId: string, locale: string) {
    return apiClient<iMovieDetails>(`movies/${movieId}/`, locale);
}

export function useMovie(movieId: string, enabled = true) {
    return useApiQuery(
        ["movie", movieId],
        (locale) => getMovie(movieId, locale),
        enabled,
    );
}

function getMovies(locale: string, search_title?: string, page?: number, signal?: AbortSignal) {
    let endpoint = "movies/";
    if (search_title === "directstream")
        endpoint += "directstream/"
    else if (search_title === "featured")
        endpoint += "featured/"
    else if (search_title === "top-rated")
        endpoint += "top-rated/"
    else if (search_title)
        endpoint += `?search=${search_title}&page=${page}`;
    return apiClient<tListResponse<iMovie>>(endpoint, locale, {signal});
}

export function useMovies(search_title?: string, page?: number, enabled = true) {
    const [debouncedQuery] = useDebounce(search_title ?? "", 200);

    return useApiQuery(
        ["movies", debouncedQuery, page ?? 1],
        (locale, signal) => getMovies(locale, debouncedQuery, page, signal),
        enabled
    );
}

export function updateMovieProgress(movieId: string, progress: number, pourcent: number, complete: boolean) {
    return apiClient<iProgress>(`movies/${movieId}/progress/`, undefined, {method: "PATCH", body: JSON.stringify({progress, pourcent, complete})});
}

export function deleteMovieProgress(movieId: string) {
    return apiClient<iProgress>(`movies/${movieId}/progress/`, undefined, {method: "DELETE"});
}

export function updateMovieFeature(local: string, movieId: string, feature: boolean, backdrop_url: string) {
    return apiClient<iMovie>(`movies/${movieId}/feature/`, local, {method: "PATCH", body: JSON.stringify({feature, backdrop_url})});
}

export function syncMovieProgress(queryClient: QueryClient, userId: number, movie: iMovieDetails, progress?: iProgress) {
    updateQuery(queryClient, ["movies"], {...movie, ...progress});
    updateMovie(queryClient, {...movie, ...progress});
    const updatedMovie = {...movie, ...progress};
    const historyQueries = queryClient.getQueriesData<tListResponse<iMovie>>({queryKey: ["user-movie-history", userId]});
    historyQueries.forEach(([queryKey, current]) => {
        if (!current)
            return;
        const findProgress = current.results.some((item) => item.id === movie.id);
        let nextCount = current.count;
        let nextHistory: iMovie[];

        if (!progress) {
            const index = current.results.findIndex(item => item.id === movie.id);
            nextHistory = current.results.filter((_, i) => i !== index);
            nextCount -= 1;
        }
        else if (findProgress) {
            nextCount += 1;
            nextHistory = current.results.map((item) => item.id === movie.id ? updatedMovie : item);
        }
        else
            nextHistory = [updatedMovie, ...current.results];

        queryClient.setQueryData(queryKey, {
            ...current,
            results: nextHistory,
            count: nextCount,
        });
    });
}

export function torrentStreaming(torrentId: string, method: "POST" | "DELETE") {
    return apiClient<tListResponse<iTorrent>>(`torrents/${torrentId}/`, undefined, {method: method});
}

function getTorrents(locale: string, movieId?: string) {
    return apiClient<tListResponse<iTorrent>>(`movies/${movieId}/torrents/`, locale);
}

export function useTorrents(movieId?: string) {
    return useApiQuery(
        ["torrents", movieId ?? ""],
        (locale) => getTorrents(locale, movieId),
        movieId !== undefined
    );
}
