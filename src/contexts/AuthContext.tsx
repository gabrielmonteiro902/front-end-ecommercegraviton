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

const SESSION_KEY = "graviton_session";
const TENANT_KEY = "graviton_tenant_id";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<AuthSession | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) {
            setLoading(false);
            return;
        }

        let cached: AuthSession | null = null;
        try {
            cached = JSON.parse(raw);
        } catch {
            localStorage.removeItem(SESSION_KEY);
        }

        if (!cached) {
            setLoading(false);
            return;
        }

        // O JWT está num cookie HttpOnly (invisível ao JS), então confirmamos a sessão
        // com o backend via /me. Se o cookie expirou/sumiu, o 401 limpa tudo.
        api.get("/me")
            .then(() => setSession(cached))
            .catch(() => {
                localStorage.removeItem(SESSION_KEY);
                localStorage.removeItem(TENANT_KEY);
                setSession(null);
            })
            .finally(() => setLoading(false));
    }, []);

    const login = (data: AuthSession) => {
        setSession(data);
        localStorage.setItem(SESSION_KEY, JSON.stringify(data));
        if (data.tenant_id) {
            localStorage.setItem(TENANT_KEY, data.tenant_id);
        }
    };

    const logout = async () => {
        try {
            await api.post("/logout");
        } catch {
            // cookie já expirado/inválido — limpa o estado local mesmo assim
        }
        setSession(null);
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(TENANT_KEY);
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
