import {iMediaDetails, iCollection} from "@/types/media";
import {iMedia, iProgress, iTorrent} from "@/types/media";
import {useDebounce} from "use-debounce";
import useApiQuery from "@/hooks/useApiQuery";
import apiClient from "@/services/apiClient";
import {tListResponse} from "@/types/api";
import {QueryClient} from "@tanstack/react-query";
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
            else if (search_title === "top-rated")
                endpoint += "top-rated/"
            else if (search_title)
                endpoint += `?search=${search_title}&page=${page}`;
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

const NO_PROGRESS: iProgress = {progress: 0, complete: false, pourcent: 0, watched_at: ""};

export function syncMediaProgress(queryClient: QueryClient, userId: number, media: iMedia, progress?: iProgress, episodeNumber?: number) {
    const mediaId = String(media.id);
    const sameMedia = (item: iMedia) => String(item.id) === mediaId && item.type === media.type;

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
    queryClient.setQueriesData<iMediaDetails>({queryKey: ["media", media.type, mediaId]}, (current) => current && {...current, ...newProgress});
    if (media.type === "series")
        return;

    const updatedMedia = {...media, ...newProgress};
    const historyQueries = queryClient.getQueriesData<tListResponse<iMedia>>({queryKey: ["user-media-history", userId]});
    historyQueries.forEach(([queryKey, current]) => {
        if (!current)
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
