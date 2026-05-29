"use client"

import {deGenres, enGenres, frGenres, iGenre} from "@/types/genre";

export type tResponseGenre = {genres: iGenre[]};

export async function fetchGenres(language: string): Promise<tResponseGenre> {
    const url = `https://api.themoviedb.org/3/genre/movie/list?language=${language}`;

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                accept: "application/json",
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
            }
        });

        if (!response.ok)
            throw new Error("Request failed");
        return await response.json();
    }
    catch {
        if (language === "fr")
            return { genres: frGenres };
        if (language === "de")
            return { genres: deGenres };
        return { genres: enGenres };
    }
}
