import { useContext, createContext, useState, useEffect, type ReactNode } from "react";

import type { Database } from "../types/database";

type AdminID = Database['public']['Tables']['admins']['Row'];

interface AuthContextType {
    user: AdminID | null;
    login: (admin: AdminID) => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<AdminID | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = sessionStorage.getItem("graviton_admin");
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch (e) {
            console.error("Erro ao carregar sessão:", e);
          }
        }
        setLoading(false);
      }, []);

      const login = (admin: AdminID) => {
        setUser(admin);
        sessionStorage.setItem("graviton_admin", JSON.stringify(admin));
      };

      const logout = () => {
        setUser(null);
        sessionStorage.removeItem("graviton_admin");
      };

      return(
        <AuthContext.Provider value={{ user, login, logout, loading}}>
          {children}
        </AuthContext.Provider>
      )
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
     throw new Error("useAuth deve ser usado dentro de um AuthProvider")
  }
  return context;
}