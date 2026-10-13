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

export const PREFERRED_LANGUAGES = ["vo", "vf"] as const;
export type tPreferredLanguage = (typeof PREFERRED_LANGUAGES)[number];

export interface iUser {
    id: number
    username: string
    color: tUserColor
    profile_picture: null | string
    created_at: string
    perm?: string
    is_following?: boolean
    group_series?: boolean
    preferred_language?: tPreferredLanguage
}
