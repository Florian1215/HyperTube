export interface iMovie {
    id: string
    title: string
    year: string
    poster_url: string
    backdrop_url: string
    genres: number[]
    note: number
    popularity: number
    vote_count: number
    complete?: boolean
    progress?: number
    pourcent?: number
}

export interface iMovieDetails extends iMovie {
    tmdb_id: string
    runtime_minutes: number
    summary: string
    directors: iPeople[]
    cast: iPeople[]
}

export interface iPeople {
    id: string
    name: string
    picture?: string
}

export interface iTorrent {
    id: string
    title: string
    source: string
    quality: string
    size: number
    language: string
    seeds: string
}

export interface iProgress {
    progress: number
    complete: boolean
    pourcent: number
}
