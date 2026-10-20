import {InfiniteData, QueryClient, useInfiniteQuery, useQuery} from "@tanstack/react-query";
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

export function useApiInfiniteQuery<T>(key: unknown[], fn: (locale: string, page: number, signal?: AbortSignal) => Promise<tListResponse<T>>, enabled = true) {
    const locale = useLocale();
    const queryKey = [...key, locale];

    return useInfiniteQuery({
        queryKey: queryKey,
        queryFn: ({pageParam, signal}) => fn(locale, pageParam, signal),
        initialPageParam: 1,
        getNextPageParam: (lastPage, _, lastPageParam) => lastPage.next ? lastPageParam + 1 : undefined,
        enabled: enabled && !!locale,
        retry: false
    });
}

export type tListData<T> = tListResponse<T> | InfiniteData<tListResponse<T>, number>;

export function mapListData<T>(current: tListData<T>, fn: (list: tListResponse<T>, index: number) => tListResponse<T>): tListData<T> {
    if ("pages" in current)
        return {...current, pages: current.pages.map(fn)};
    return fn(current, 0);
}

export function addQuery<T>(queryClient: QueryClient, key: unknown[], newContent: T) {
    const queries = queryClient.getQueriesData<tListData<unknown>>({queryKey: key});
    queries.forEach(([queryKey, current]) => {
        if (!current)
            return;
        queryClient.setQueryData(queryKey, mapListData(current, (list, i) => ({
            ...list,
            results: i === 0 ? [newContent, ...list.results] : list.results,
            count: list.count + 1
        })));
    });
}

export function updateQuery<T extends { id: string | number }>(queryClient: QueryClient, key: unknown[], newContent: T) {
    const queries = queryClient.getQueriesData<tListData<T>>({queryKey: key});
    queries.forEach(([queryKey, current]) => {
        if (!current)
            return;
        queryClient.setQueryData(queryKey, mapListData(current, (list) => ({
            ...list,
            results: list.results.map((v) => {
                if (v.id === newContent.id)
                    return newContent;
                return v;
            })
        })));
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
        queryClient.getQueriesData<tListData<iMedia>>({queryKey: [key]}).forEach(([queryKey, current]) => {
            if (current)
                queryClient.setQueryData(queryKey, mapListData(current, (list) => list.results ? {...list, results: list.results.map(setBackdrop)} : list));
        });
    });
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
    const queries = queryClient.getQueriesData<tListData<unknown>>({queryKey: key});
    queries.forEach(([queryKey, current]) => {
        if (!current)
            return;
        const pages = "pages" in current ? current.pages : [current];
        if (!pages.some((list) => list.results.some((i) => (i as {id: string}).id === deleteObjId)))
            return;
        queryClient.setQueryData(queryKey, mapListData(current, (list) => ({
            ...list,
            results: list.results.filter((i) => {
                const data = i as {id: string};
                return data.id !== deleteObjId
            }),
            count: list.count - 1
        })));
    });
}
