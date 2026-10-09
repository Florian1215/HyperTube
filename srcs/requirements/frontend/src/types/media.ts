import {tListResponse} from "@/types/api";
import {tMedia} from "@/types/utils";
import {iSmallEpisode} from "@/types/serie";
import {iUser} from "@/types/user";

export interface iMedia {
    id: string
    title: string
    year: string
    poster_url: string
    backdrop_url: string
    genres: number[]
    rating: number
    vote_count: number
    release_date: string
    complete: boolean
    pourcent: number
    type: tMedia
    progress: number
    watched_at: string
    in_watchlist?: boolean
    episode?: iSmallEpisode
}

export interface iMediaActivity extends iMedia {
    user: iUser
}

export interface iMediaDetails extends iMedia{
    original_title: string
    original_language: string
    budget: number | null
    revenue: number | null
    production_countries: string[]
    production_companies: string[]
    summary: string
    crew: iPeople[]
    cast: iPeople[]
    backdrops_url: string[]
    feature: boolean
    watched_by: iUser[]
}

export interface iCollectionPart extends iMedia {
    summary: string
}

export interface iCollection {
    id: number | null
    name: string | null
    parts: iCollectionPart[]
}

export interface iPeople {
    id: string
    name: string
    job?: string
    character?: string
    picture?: string
    department?: string | null
    known_for?: Pick<iMedia, "id" | "type" | "title">[]
    watched_count?: number
}

export interface iPerson extends iPeople {
    biography: string
    birthday: string | null
    deathday: string | null
    place_of_birth: string | null
    medias_count: number
}

export const PERSON_ROLES = ["cast", "directing", "writing", "crew"] as const;
export type tPersonRole = (typeof PERSON_ROLES)[number];

export interface iPersonMedia extends iMedia {
    roles: string[]
}

export type tPersonMediasResponse = tListResponse<iPersonMedia> & {counts: Record<tPersonRole, number>};

export interface iTorrent {
    id: string
    title: string
    status: "not-downloaded" | "downloading" | "transcoding" | "completed" | "error"
    quality: string
    size: number
    language: string
    seeders: number
    peers: number
    created_at: string
}

export interface iProgress {
    // progress: number
    // progress: number
    progress: number
    complete: boolean
    pourcent: number
    watched_at: string
}
