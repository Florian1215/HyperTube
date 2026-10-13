import {QueryClient, useQuery} from "@tanstack/react-query";
import {useLocale} from "next-intl";
import {tListResponse} from "@/types/api";
import {iCollection, iMedia, iMediaDetails} from "@/types/media";

export default function useApiQuery<T>(key: unknown[], fn: (locale: string, signal?: AbortSignal) => Promise<T>, enabled = true) {
    const locale = useLocale();
    const queryKey = [...key, locale];

    return useQuery({
        queryKey: queryKey,
        queryFn: ({signal}) => fn(locale, signal),
        enabled: enabled && !!locale,
        retry: false
    });
}

export function addQuery<T>(queryClient: QueryClient, key: unknown[], newContent: T) {
    const queries = queryClient.getQueriesData<tListResponse<unknown>>({queryKey: key});
    queries.forEach(([queryKey, current]) => {
        if (!current)
            return;
        queryClient.setQueryData(queryKey, {
            ...current,
            results: [newContent, ...current.results],
            count: current.count + 1
        });
    });
}

export function updateQuery<T extends { id: string | number }>(queryClient: QueryClient, key: unknown[], newContent: T) {
    const queries = queryClient.getQueriesData<tListResponse<T>>({queryKey: key});
    queries.forEach(([queryKey, current]) => {
        if (!current)
            return;
        queryClient.setQueryData(queryKey, {
            ...current,
            results: current.results.map((v) => {
                if (v.id === newContent.id)
                    return newContent;
                return v;
            })
        });
    });
}

export function updateMedia(queryClient: QueryClient, newContent: iMediaDetails) {
    const queries = queryClient.getQueriesData({queryKey: ["media", newContent.type, newContent.id]});
    queries.forEach(([queryKey, current]) => {
        if (!current)
            return;
        queryClient.setQueryData(queryKey, newContent);
    });
}

export function updateMediaBackdrop(queryClient: QueryClient, media: Pick<iMedia, "id" | "type" | "backdrop_url">) {
    const setBackdrop = <T extends Pick<iMedia, "id" | "type" | "backdrop_url">>(v: T): T =>
        (v.type === media.type && String(v.id) === String(media.id)) ? {...v, backdrop_url: media.backdrop_url} : v;

    ["medias", "user-media-history", "user-watchlist"].forEach((key) => {
        queryClient.getQueriesData<tListResponse<iMedia>>({queryKey: [key]}).forEach(([queryKey, current]) => {
            if (current?.results)
                queryClient.setQueryData(queryKey, {...current, results: current.results.map(setBackdrop)});
        });
    });
    // the medias of the people: ["person", id, "medias", ...]
    queryClient.getQueriesData<tListResponse<iMedia>>({queryKey: ["person"], predicate: (query) => query.queryKey[2] === "medias"}).forEach(([queryKey, current]) => {
        if (current?.results)
            queryClient.setQueryData(queryKey, {...current, results: current.results.map(setBackdrop)});
    });
    queryClient.getQueriesData<iCollection>({queryKey: ["collection"]}).forEach(([queryKey, current]) => {
        if (current?.parts)
            queryClient.setQueryData(queryKey, {...current, parts: current.parts.map(setBackdrop)});
    });
}

export function removeQuery(queryClient: QueryClient, key: unknown[], deleteObjId: number | string) {
    const queries = queryClient.getQueriesData<tListResponse<unknown>>({queryKey: key});
    queries.forEach(([queryKey, current]) => {
        if (!current)
            return;
        const nextData = current.results.filter((i) => {
            const data = i as {id: string};
            return data.id !== deleteObjId
        })
        if (nextData.length === current.results.length)
            return;
        queryClient.setQueryData(queryKey, {
            ...current,
            results: nextData,
            count: current.count - 1
        });
    });
}
