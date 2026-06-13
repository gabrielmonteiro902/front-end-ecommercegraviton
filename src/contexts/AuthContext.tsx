import { useContext, createContext, useState, useEffect, type ReactNode } from "react";
import { api } from "../services/api";
import type { AuthSession } from "../types/database";

interface AuthContextType {
    session: AuthSession | null;
    login: (session: AuthSession) => void;
    logout: () => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<AuthSession | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const raw = sessionStorage.getItem("graviton_session");
        if (raw) {
            try {
                setSession(JSON.parse(raw));
            } catch {
                sessionStorage.removeItem("graviton_session");
            }
        }
        setLoading(false);
    }, []);

    const login = (data: AuthSession) => {
        setSession(data);
        sessionStorage.setItem("graviton_session", JSON.stringify(data));
    };

    const logout = async () => {
        try {
            await api.post("/logout");
        } catch {
            // token já expirado — limpa mesmo assim
        }
        setSession(null);
        sessionStorage.removeItem("graviton_session");
    };

    return (
        <AuthContext.Provider value={{ session, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth deve ser usado dentro de um AuthProvider");
    }
    return context;
};
