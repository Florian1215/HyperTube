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
export const HISTORY_VISIBILITIES = ["public", "friends", "private"] as const;
export type tHistoryVisibility = (typeof HISTORY_VISIBILITIES)[number];
export type tPreferredLanguage = (typeof PREFERRED_LANGUAGES)[number];

export interface iUser {
    id: number
    username: string
    color: tUserColor
    profile_picture: null | string
    created_at: string
    perm?: string
    is_following?: boolean
    following_count?: number
    followers_count?: number
    can_see_history?: boolean
    is_blocked?: boolean
    history_visibility?: tHistoryVisibility
    preferred_language?: tPreferredLanguage
}
