"use client";

import {useQuery} from "@tanstack/react-query";
import {deGenres, enGenres, frGenres} from "@/types/genre";

export default function useGenres(language: string) {
    return useQuery({
        queryKey: ["genres", language],
        queryFn: () => getFallbackGenres(language),
    });
}

function getFallbackGenres(language: string) {
    switch (language) {
        case "fr":
            return { genres: frGenres };
        case "de":
            return { genres: deGenres };
        default:
            return { genres: enGenres };
    }
}
