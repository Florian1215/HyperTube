import {QueryClient, useQuery} from "@tanstack/react-query";
import {useLocale} from "next-intl";
import {tListResponse} from "@/types/api";
import {iMovieDetails} from "@/types/movie";

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

export function updateMovie(queryClient: QueryClient, newContent: iMovieDetails) {
    const queries = queryClient.getQueriesData({queryKey: ["movie"]});
    queries.forEach(([queryKey, current]) => {
        if (!current)
            return;
        queryClient.setQueryData(queryKey, newContent);
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
