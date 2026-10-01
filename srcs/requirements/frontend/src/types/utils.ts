import React from "react";
import {iUser} from "@/types/user";

export interface iAxe {
    x: number
    y: number
}

export type tSort = "title" | "genre" | "grade" | "year";
export interface iSort {
    type?: tSort;
    side: boolean;
}

export type tTab = {
    name: string
    comp: ({user, updateUser}: {user: iUser, updateUser?: (patch: Partial<iUser>) => void}) => React.JSX.Element
}[];

export type fieldType = "login" | "username" | "password" | "current-password" | "new-password" | "confirm-new-password";

export const MEDIA_TYPES = ["movies", "series"] as const;
export type tMedia = (typeof MEDIA_TYPES)[number];
export const SEARCH_TYPES = [...MEDIA_TYPES, "people", "users"] as const;
export type tSearch = (typeof SEARCH_TYPES)[number];

export type tT = (key: string) => string;

export interface iWatchEpisode {
    runtime: number
    episode: number
    season: number
}
