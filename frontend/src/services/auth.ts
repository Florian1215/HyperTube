import {API_URL, apiFetch, tResponse} from "@/services/api";
import {iUserToken} from "@/types/user";
import {tOauthService} from "@/components/OAuth";

type ApiUser = {
    id: number
    username: string
    email: string
    first_name?: string
    last_name?: string
    firstname?: string
    lastname?: string
    color?: string
    profile_picture?: null | string
    watch_history?: {movie_id: string, watch_percent: number}[]
    joined_at?: number | string
    created_at?: string
}

type ApiAuthPayload = {
    user: ApiUser
    access_token: string
    token_type: "Bearer"
    expires_in: number
}

export function postLogin(email: string, password: string) {
    return apiFetch<tResponse<ApiAuthPayload>>("/auth/login", undefined, {method: "POST", body: JSON.stringify({email, password})})
        .then(({data}) => normalizeAuthPayload(data));
}

export function postRegister(email: string, username: string, firstname: string, lastname: string, password: string) {
    return apiFetch<tResponse<ApiAuthPayload>>("/auth/register", undefined, {
        method: "POST",
        body: JSON.stringify({email, username, first_name: firstname, last_name: lastname, password}),
    }).then(({data}) => normalizeAuthPayload(data));
}

export function handleOauth(oauthCompany: tOauthService) {
    window.location.href = `${API_URL}/auth/${oauthCompany}/login`;
}

export function parseOAuthCallbackHash(hash: string): iUserToken {
    const fragment = hash.startsWith("#") ? hash.slice(1) : hash;
    const params = new URLSearchParams(fragment);
    const accessToken = params.get("access_token");
    const tokenType = params.get("token_type");
    const rawUser = params.get("user");

    if (!accessToken || tokenType !== "Bearer" || !rawUser)
        throw new Error("Invalid OAuth callback payload");

    const expiresIn = Number(params.get("expires_in") ?? 0);
    return normalizeAuthPayload({
        access_token: accessToken,
        token_type: tokenType,
        expires_in: Number.isFinite(expiresIn) ? expiresIn : 0,
        user: JSON.parse(rawUser) as ApiUser,
    });
}

function normalizeAuthPayload(payload: ApiAuthPayload): iUserToken {
    const user = normalizeUser(payload.user);
    if (!Number.isFinite(user.id) || !user.username)
        throw new Error("Invalid auth user payload");

    return {
        access_token: payload.access_token,
        token_type: payload.token_type,
        expires_in: payload.expires_in,
        user,
    };
}

function normalizeUser(user: ApiUser) {
    const joinedAt = normalizeJoinedAt(user.joined_at ?? user.created_at);

    return {
        id: Number(user.id),
        username: user.username,
        firstname: user.firstname ?? user.first_name ?? "",
        lastname: user.lastname ?? user.last_name ?? "",
        email: user.email,
        color: user.color ?? "purple",
        profile_picture: user.profile_picture ?? null,
        watch_history: Array.isArray(user.watch_history) ? user.watch_history : [],
        joined_at: joinedAt,
    };
}

function normalizeJoinedAt(value: number | string | undefined): number {
    if (typeof value === "number")
        return value;
    if (typeof value === "string") {
        const timestamp = Date.parse(value);
        if (Number.isFinite(timestamp))
            return timestamp;
    }
    return Date.now();
}

// todo implement /api/v1/auth/password-reset
