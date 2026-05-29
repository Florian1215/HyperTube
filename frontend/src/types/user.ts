export interface iUserToken {
    user: iUser
    access_token: string
    token_type: "Bearer"
    expires_in: 900
}

export interface iUser {
    id: number
    username: string
    firstname: string
    lastname: string
    email: string
    color: string
    profile_picture: null | string
    watch_history: {movie_id: string, watch_percent: number}[]
    joined_at: number
}
