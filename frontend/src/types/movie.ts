export interface iMovie {
    imdb_id: string
    title: string
    year: string
    poster_url: string
    backdrop_url: string
    genres: number[]
    note: number
}

export interface iMovieDetails extends iMovie {
    "tmdb_id": string
    "runtime_minutes": number
    "summary": string
    "director": string
    "cast": string[]
    "watched": boolean
    "progression": number
}

export interface iTorrent {
    "id": string
    "title": string
    "source": string
    "quality": string
    "size": number
    "language": string
    "seeds": string
}
