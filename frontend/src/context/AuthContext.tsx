"use client";

import {createContext, useContext, useEffect, useState, ReactNode,} from "react";
import {iUser} from "@/types/user";
import {tErrorResponse} from "@/services/api";
import {tNotificationType} from "@/context/NotificationContext";

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
        const userData = localStorage.getItem("user");

        if (userData && userData !== "undefined" && userData !== "null") {
            try {
                const parsed = JSON.parse(userData);
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setUser(parsed);
            } catch {
                console.warn("Invalid user in localStorage:", userData);
                localStorage.removeItem("user");
            }
        }

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

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context)
        throw new Error("useAuth must be used inside AuthProvider");
    return context;
}

export function handleErrorRequest(err: tErrorResponse, addNotification: (message: string, type?: tNotificationType) => void, setErrors: (newError: Record<string, string>) => void, networkErrorMsg: string) {
    if (!err?.data)
        addNotification(networkErrorMsg, "error");
    else if (err.data.error.fields) {
        const newErrors: Record<string, string> = {};

        Object.entries(err.data.error.fields).map(([key, value])=> {
            newErrors[key] = value.message;
        });
        setErrors(newErrors);
    }
    else
        addNotification(`${err.status} - ${err.data.error.message}`, "error");
}
