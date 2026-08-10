export type tOauthService = "42" | "github" | "gitlab" | null;

export interface iToken {
    access_token: string
    token_type: "Bearer"
    expires_in: number
}

export interface iUserToken {
    user: iUser
    access_token: string
    refresh_token: string
    token_type: "Bearer"
    expires_in: number
}

export type tUserColor =
    | "yellow"
    | "pink"
    | "green"
    | "purple"
    | "blue"
    | "red"

export interface iUser {
    id: number
    username: string
    first_name: string
    last_name: string
    email: string
    oauth_method: tOauthService
    color: tUserColor
    profile_picture: null | string
    created_at: number
}
