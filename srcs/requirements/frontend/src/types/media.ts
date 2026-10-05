import {tMedia} from "@/types/utils";
import {iSmallEpisode} from "@/types/serie";

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
    episode?: iSmallEpisode
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
}

export interface iPeople {
    id: string
    name: string
    job?: string
    character?: string
    picture?: string
}

export interface iTorrent {
    id: string
    title: string
    url: string
    status: "not-downloaded" | "downloading" | "transcoding" | "completed" | "error" | "cancelled"
    quality: string
    size: number
    language: string
    seeds: number
    peers: number
    created_at: string
}

export interface iTorrentStream {
    id: string
    status: iTorrent["status"]
    stream_id: string
}

export interface iProgress {
    // progress: number
    // progress: number
    progress: number
    complete: boolean
    pourcent: number
    watched_at: string
}
