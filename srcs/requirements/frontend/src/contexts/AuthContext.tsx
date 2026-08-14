"use client";

import {createContext, useContext, useEffect, useState, ReactNode} from "react";
import {iUser} from "@/types/user";
import {usePathname, useRouter} from "@/i18n/navigation";
import {getUser} from "@/services/users.service";
import {useLocale} from "next-intl";
import {tLocale} from "@/i18n/request";

interface AuthContextType {
    user?: iUser;
    loading?: boolean;
    login: (token: string, refresh: string) => void;
    logout: () => void;
    updateUser: (patch: Partial<iUser>) => void;
    callbackUrl?: string
    setCallbackUrl: (callbackUrl?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({children}: {children: ReactNode}) {
    const [user, setUser] = useState<iUser>();
    const [callbackUrl, setCallbackUrl] = useState<string>();
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale() as tLocale;
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const restoreSession = async () => {
            const access = localStorage.getItem("access");

            if (!access) {
                setLoading(false);
                return;
            }

            try {
                const data = await getUser(locale, 'me')
                setUser(data);
            } catch {

            } finally {
                setLoading(false);
            }
        };

        restoreSession().then(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = async (access: string, refresh: string) => {
        localStorage.setItem("access", access);
        localStorage.setItem("refresh", refresh);
        const data = await getUser(locale, 'me')
        setUser(data);
    };

    const logout = () => {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        setUser(undefined);
        if (pathname === "/users")
            router.push("/");
    };

    const updateUser = (patch: Partial<iUser>) => {
        setUser((prev) => {
            if (!prev)
                return prev;
            return {...prev, ...patch};
        });
    };

    return (<AuthContext.Provider
        value={{user, loading, login, logout, updateUser, callbackUrl, setCallbackUrl}}>
        {children}
    </AuthContext.Provider>);
}

export default function useAuth() {
    const context = useContext(AuthContext);
    if (!context)
        throw new Error("useAuth must be used inside AuthProvider");
    return context;
}
