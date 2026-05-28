import {API_URL, apiFetch, tResponse} from "@/services/api";
import {iUser, iUserToken} from "@/types/user";
import {tOauthService} from "@/components/OAuth";

export type BackendUser = {
    id: number;
    email: string;
    username: string;
    first_name?: string;
    last_name?: string;
    firstname?: string;
    lastname?: string;
    color?: string;
    profile_picture?: string | null;
    watch_history?: iUser["watch_history"];
    joined_at?: number;
    created_at?: string;
};

export type BackendAuthResponse = Omit<iUserToken, "user"> & {
    user: BackendUser;
};

export function postLogin(email: string, password: string) {
    return apiFetch<tResponse<BackendAuthResponse>>("/auth/login", undefined, {method: "POST", body: JSON.stringify({email, password})})
        .then(normalizeAuthResponse);
}

export function postRegister(email: string, username: string, firstname: string, lastname: string, password: string) {
    return apiFetch<tResponse<BackendAuthResponse>>("/auth/register", undefined, {
        method: "POST",
        body: JSON.stringify({email, username, first_name: firstname, last_name: lastname, password}),
    }).then(normalizeAuthResponse);
}

export function handleOauth(oatuhCompany: tOauthService) {
    window.location.href = `${API_URL}/auth/${oatuhCompany}/login`;
}

// todo implement /api/v1/auth/password-reset

function normalizeAuthResponse(response: tResponse<BackendAuthResponse>): iUserToken {
    return normalizeAuthPayload(response.data);
}

export function normalizeAuthPayload(auth: BackendAuthResponse): iUserToken {
    const user = auth.user;

    return {
        ...auth,
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            firstname: user.firstname ?? user.first_name ?? "",
            lastname: user.lastname ?? user.last_name ?? "",
            color: user.color ?? "purple",
            profile_picture: user.profile_picture ?? null,
            watch_history: user.watch_history ?? [],
            joined_at: user.joined_at ?? (user.created_at ? Date.parse(user.created_at) : Date.now()),
        },
    };
}
