import {iMedia, iMediaDetails, iProgress} from "@/types/media";

export interface iSerie extends iMedia {
    end_date: string | null
    number_of_seasons: number
    number_of_episodes: number
}

export interface iSerieDetails extends iSerie, iMediaDetails {
    status: "Returning Series" | "Planned" | "In Production" | "Pilot" | "Ended" | "Canceled"
    in_production: boolean
    next_episode: iNextEpisode
}

export interface iNextEpisode {
    season_number: number
    episode_number: number
    progress: number
}

export interface iSeason {
    id: number
    name: string
    overview: string
    season_number: number
    rating: number
    release_date: string
    poster_url: string
    complete: boolean
    pourcent: number
    episodes: iEpisode[]
}

export interface iEpisode extends iProgress {
    id: number
    name: string
    overview: string
    episode_number: number
    episode_type: string
    runtime: number
    rating: number
    release_date: string
    poster_url: string
}

export interface iSmallEpisode {
    id: number
    poster_url: string
    episode_number: number
    season_number: number
}
