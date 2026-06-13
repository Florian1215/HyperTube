import {tOauthService} from "@/components/ui/Form";

export interface iToken {
    access_token: string
    token_type: "Bearer"
    expires_in: number
}

export interface iUserToken {
    user: iUser
    access_token: string
    token_type: "Bearer"
    expires_in: number
}

export interface iUser {
    id: number
    username: string
    first_name: string
    last_name: string
    email: string
    oauth_method: tOauthService // todo handle
    color: string
    profile_picture: null | string
    watch_history: {movie_id: string, watch_percent: number}[]
    created_at: number
}
