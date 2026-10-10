import {iMediaDetails, iCollection} from "@/types/media";
import {iMedia, iProgress, iTorrent} from "@/types/media";
import {useDebounce} from "use-debounce";
import useApiQuery from "@/hooks/useApiQuery";
import apiClient from "@/services/apiClient";
import {tListResponse} from "@/types/api";
import {Query, QueryClient} from "@tanstack/react-query";
import {tMedia, tSearch} from "@/types/utils";
import {iSerieDetails} from "@/types/serie";
import {iMovieDetails} from "@/types/movie";

export function useMedia(mediaType: tMedia, mediaId: string, enabled = true) {
    return useApiQuery(
        ["media", mediaType, mediaId],
        (locale) => apiClient<iMovieDetails | iSerieDetails>(`${mediaType}/${mediaId}/`, locale),
        enabled,
    );
}

export function useCollection(media?: iMedia) {
    return useApiQuery(
        ["collection", media?.id ?? ""],
        (locale) => apiClient<iCollection>(`movies/${media?.id}/collection/`, locale),
        media?.type === "movies",
    );
}

export const SEARCH_UPCOMING = "upcoming";
export const SEARCH_CONTINUE = "continue to watch";
export const SEARCH_FRIENDS = "friends activity";

export function useItems(type: tSearch, search_title?: string, page?: number, enabled = true) {
    const [debouncedQuery] = useDebounce(search_title ?? "", 200);

    return useApiQuery(
        ["medias", type, debouncedQuery, page ?? 1],
        (locale, signal) => {
            let endpoint = `${type}/`;

            if (search_title === "directstream")
                endpoint += "directstream/"
            else if (search_title === "featured")
                endpoint += "featured/"
            else if (search_title === SEARCH_UPCOMING)
                endpoint += `upcoming/?page=${page ?? 1}`
            else if (search_title === SEARCH_CONTINUE)
                endpoint += `continue-watching/?page=${page ?? 1}`
            else if (search_title === SEARCH_FRIENDS)
                endpoint += `friends-activity/?page=${page ?? 1}`
            else if (search_title === "top-rated")
                endpoint += `top-rated/?page=${page ?? 1}`
            else if (search_title)
                endpoint += `?search=${search_title}&page=${page ?? 1}`;
            else
                endpoint += `?page=${page ?? 1}`;
            return apiClient<tListResponse<iMedia>>(endpoint, locale, {signal});
        },
        enabled
    );
}

export function updateMediaProgress(mediaId: string, mediaType: tMedia, progress: number, pourcent: number, complete: boolean, addWatchAt=true, season_number?: number, episode_number?: number) {
    let data;
    if (mediaType === "series" && episode_number === undefined) {
        if (season_number !== undefined)
            data = {season_number};
        return apiClient<iProgress>(`series/${mediaId}/watched/`, undefined, {method: "POST", body: JSON.stringify(data)});
    }

    data = {progress, pourcent, complete, ...(!addWatchAt ? { watched_at: null } : {}), season_number, episode_number};
    return apiClient<iProgress>(`${mediaType}/${mediaId}/progress/`, undefined, {method: "PATCH", body: JSON.stringify(data)});
}

export function deleteMediaProgress(mediaId: string, mediaType: tMedia, season_number?: number, episode_number?: number) {
    let data;
    if (mediaType === "series" && episode_number === undefined) {
        if (season_number !== undefined)
            data = {season_number};
        return apiClient<iProgress>(`series/${mediaId}/watched/`, undefined, {method: "DELETE", body: JSON.stringify(data)});
    }
    if (mediaType === "series")
        data = {episode_number, season_number};
    return apiClient<iProgress>(`${mediaType}/${mediaId}/progress/`, undefined, {method: "DELETE", body: JSON.stringify(data)});
}

export function updateMediaFeature(local: string, mediaType: tMedia, mediaId: string, feature: boolean, backdrop_url: string) {
    return apiClient<iMedia>(`${mediaType}/${mediaId}/feature/`, local, {method: "PATCH", body: JSON.stringify({feature, backdrop_url})});
}

export function updateMediaWatchlist(mediaId: string, mediaType: tMedia, inWatchlist: boolean) {
    return apiClient<{in_watchlist: boolean}>(`${mediaType}/${mediaId}/watchlist/`, undefined, {method: inWatchlist ? "POST" : "DELETE"});
}

export function syncMediaWatchlist(queryClient: QueryClient, media: Pick<iMedia, "id" | "type">, inWatchlist: boolean) {
    const mediaId = String(media.id);
    const setWatchlist = <T extends Pick<iMedia, "id" | "type">>(item: T): T =>
        (String(item.id) === mediaId && item.type === media.type) ? {...item, in_watchlist: inWatchlist} : item;

    [{queryKey: ["medias", media.type]}, {queryKey: ["user-media-history"]}, {queryKey: ["person"], predicate: (query: Query) => query.queryKey[2] === "medias"}].forEach((filters) => {
        queryClient.setQueriesData<tListResponse<iMedia>>(filters, (current) => current?.results && {...current, results: current.results.map(setWatchlist)});
    });
    queryClient.setQueriesData<iCollection>({queryKey: ["collection"]}, (current) => current?.parts && {...current, parts: current.parts.map(setWatchlist)});
    queryClient.setQueriesData<iMediaDetails>({queryKey: ["media", media.type, mediaId]}, (current) => current && {...current, in_watchlist: inWatchlist});
    void queryClient.invalidateQueries({queryKey: ["user-watchlist"]});
}

const NO_PROGRESS: iProgress = {progress: 0, complete: false, pourcent: 0, watched_at: ""};

export function syncMediaProgress(queryClient: QueryClient, userId: number, media: iMedia, progress?: iProgress, episodeNumber?: number) {
    const mediaId = String(media.id);
    const sameMedia = (item: iMedia) => String(item.id) === mediaId && item.type === media.type;

    void queryClient.invalidateQueries({queryKey: ["user-media-history", userId, "continue"]});

    void queryClient.invalidateQueries({queryKey: ["people"]});

    if (progress?.complete && episodeNumber === undefined)
        syncMediaWatchlist(queryClient, media, false);
    else if (progress?.complete)
        void queryClient.invalidateQueries({queryKey: ["user-watchlist"]});
    void queryClient.invalidateQueries({queryKey: ["person"], predicate: (query) => query.queryKey[2] !== "medias" || episodeNumber !== undefined});

    if (media.type === "series") {
        void queryClient.invalidateQueries({queryKey: ["series", mediaId, "season"]});
        void queryClient.invalidateQueries({queryKey: ["user-media-history", userId]});
        void queryClient.invalidateQueries({queryKey: ["media", media.type, mediaId]});
        if (episodeNumber !== undefined) {
            void queryClient.invalidateQueries({queryKey: ["medias", media.type]});
            return;
        }
    }

    const newProgress = progress ?? NO_PROGRESS;
    queryClient.setQueriesData<tListResponse<iMedia>>({queryKey: ["medias", media.type]}, (current) => current && {
        ...current,
        results: current.results.map((item) => sameMedia(item) ? {...item, ...newProgress} : item),
    });
    queryClient.setQueriesData<tListResponse<iMedia>>({queryKey: ["person"], predicate: (query) => query.queryKey[2] === "medias"}, (current) => current && {
        ...current,
        results: current.results.map((item) => sameMedia(item) ? {...item, ...newProgress} : item),
    });
    queryClient.setQueriesData<iMediaDetails>({queryKey: ["media", media.type, mediaId]}, (current) => current && {...current, ...newProgress});
    if (newProgress.complete !== media.complete)
        void queryClient.invalidateQueries({queryKey: ["media", media.type, mediaId]});
    if (media.type === "series")
        return;

    const updatedMedia = {...media, ...newProgress};
    const historyQueries = queryClient.getQueriesData<tListResponse<iMedia>>({queryKey: ["user-media-history", userId]});
    historyQueries.forEach(([queryKey, current]) => {
        if (!current || (queryKey[2] && queryKey[2] !== media.type))
            return;
        const findProgress = current.results.some(sameMedia);
        let nextCount = current.count;
        let nextHistory: iMedia[];

        if (!progress) {
            if (!findProgress)
                return;
            const index = current.results.findIndex(sameMedia);
            nextHistory = current.results.filter((_, i) => i !== index);
            nextCount -= 1;
        }
        else if (findProgress)
            nextHistory = current.results.map((item) => sameMedia(item) ? {...item, ...newProgress} : item);
        else {
            nextCount += 1;
            nextHistory = [updatedMedia, ...current.results];
        }

        queryClient.setQueryData(queryKey, {
            ...current,
            results: nextHistory,
            count: nextCount,
        });
    });
}

type tTorrentStream = {id: string, status: iTorrent["status"], stream: string};

export function torrentStreaming(torrentId: string, episode_number?: number) {
    return apiClient<tTorrentStream>(`torrents/${torrentId}/`, undefined, {method: "POST", body: JSON.stringify({episode_number})});
}

export function torrentStreamStatus(torrentId: string, episode_number?: number) {
    return apiClient<tTorrentStream>(`torrents/${torrentId}/` + (episode_number !== undefined ? `?episode_number=${episode_number}` : ""));
}

export function useTorrents(media?: iMedia, season_number?: number, episode_number?: number) {
    const isSerie = media?.type === "series";

    return useApiQuery(
        ["torrents", media?.type ?? "", media?.id ?? "", isSerie ? season_number : undefined, isSerie ? episode_number : undefined],
        (locale) => {
            let endpoint = `${media?.type}/${media?.id}/torrents/`;

            if (isSerie) {
                endpoint += `?season_number=${season_number}`;
                if (episode_number !== undefined)
                    endpoint += `&episode_number=${episode_number}`;
            }
            return apiClient<tListResponse<iTorrent>>(endpoint, locale);
        },
        media !== undefined && (!isSerie || season_number !== undefined)
    );
}
