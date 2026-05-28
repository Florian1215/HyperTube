"use client";

import {createContext, useContext, useEffect, useState, ReactNode,} from "react";
import {iUser} from "@/types/user";

type StoredUser = Partial<iUser> & {
    first_name?: string;
    last_name?: string;
    created_at?: string;
};

interface AuthContextType {
    user: iUser | null;
    login: (user: iUser, token: string) => void;
    logout: () => void;
    loading: boolean;
    updateUser: (patch: Partial<iUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({children,}: { children: ReactNode; }) {
    const [user, setUser] = useState<iUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");

        if (token && userData)
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setUser(normalizeStoredUser(JSON.parse(userData) as StoredUser));

        setLoading(false);
    }, []);

    const login = (user: iUser, token: string) => {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        setUser(user);
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
    };

    const updateUser = (patch: Partial<iUser>) => {
        setUser((prev) => {
            if (!prev)
                return prev;
            const updatedUser = {...prev, ...patch,};

            localStorage.setItem("user", JSON.stringify(updatedUser));
            return updatedUser;
        });
    };

    return (<AuthContext.Provider
        value={{user, login, logout, loading, updateUser}}>
        {children}
    </AuthContext.Provider>);
}

function normalizeStoredUser(user: StoredUser): iUser {
    return {
        id: user.id ?? 0,
        username: user.username ?? "",
        firstname: user.firstname ?? user.first_name ?? "",
        lastname: user.lastname ?? user.last_name ?? "",
        email: user.email ?? "",
        color: user.color ?? "purple",
        profile_picture: user.profile_picture ?? null,
        watch_history: user.watch_history ?? [],
        joined_at: user.joined_at ?? (user.created_at ? Date.parse(user.created_at) : Date.now()),
    };
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context)
        throw new Error("useAuth must be used inside AuthProvider");
    return context;
}
