export type tOauthService = "42" | "github" | "gitlab" | null;

export interface iToken {
    access: string
    refresh: string
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
    color: tUserColor
    profile_picture: null | string
    created_at: number
    featured?: boolean
}
