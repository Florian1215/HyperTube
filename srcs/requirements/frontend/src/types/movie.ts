export interface iMovie {
    id: string
    title: string
    year: string
    poster_url: string
    backdrop_url: string
    genres: number[]
    note: number
    vote_count: number
    release_date: string
    complete: boolean
    progress: number
    pourcent: number
}

export interface iMovieDetails extends iMovie {
    original_title: string
    runtime: number
    summary: string
    crew: iPeople[]
    cast: iPeople[]
    backdrops_url: string[]
    featured: boolean
    status: string
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
    watched_at: string
}
