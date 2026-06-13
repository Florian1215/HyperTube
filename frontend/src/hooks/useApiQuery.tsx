import {useQuery} from "@tanstack/react-query";
import {useLocale} from "next-intl";

export default function useApiQuery<T>(key: string[], fn: (locale: string, signal?: AbortSignal) => Promise<T>, enabled = true) {
    const locale = useLocale();
    const queryKey = [...key, locale];

    return useQuery({
        queryKey: queryKey,
        queryFn: ({signal}) => fn(locale, signal),
        enabled: enabled && !!locale,
        retry: false
    });
}
