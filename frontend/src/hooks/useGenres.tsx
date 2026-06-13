"use client";

import {useQuery} from "@tanstack/react-query";
import {fetchGenres} from "@/services/genre.service";

export function useGenres(language: string) {
    return useQuery({
        queryKey: ["genres", language],
        queryFn: () => fetchGenres(language),
    });
}
