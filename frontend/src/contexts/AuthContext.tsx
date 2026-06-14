"use client";

import {createContext, useContext, useEffect, useState, ReactNode} from "react";
import {iUser} from "@/types/user";
import {usePathname, useRouter} from "@/i18n/navigation";

interface AuthContextType {
    user: iUser | null;
    login: (user: iUser, token: string) => void;
    logout: () => void;
    loading: boolean;
    updateUser: (patch: Partial<iUser>) => void;
    callbackUrl: string | null
    setCallbackUrl: (callbackUrl: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({children}: {children: ReactNode}) {
    const [user, setUser] = useState<iUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [callbackUrl, setCallbackUrl] = useState<string | null>(null);
    const router = useRouter();
    const pathname = usePathname();

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
        localStorage.removeItem("password");
        localStorage.removeItem("user");
        setUser(null);
        if (pathname !== "/" && pathname !== "/movies")
            router.push("/");
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
        value={{user, login, logout, loading, updateUser, callbackUrl, setCallbackUrl}}>
        {children}
    </AuthContext.Provider>);
}

export default function useAuth() {
    const context = useContext(AuthContext);
    if (!context)
        throw new Error("useAuth must be used inside AuthProvider");
    return context;
}
