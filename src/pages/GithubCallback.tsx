import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

/**
 * Página de retorno do OAuth do GitHub. O backend já setou o cookie HttpOnly
 * com o JWT; aqui só confirmamos a sessão via /me e estabelecemos o estado local.
 */
export default function GithubCallback() {
    const navigate = useNavigate();
    const { login } = useAuth();

    useEffect(() => {
        api.get("/me")
            .then(res => {
                login({ tenant_id: res.data.tenant_id });
                navigate("/graviton-home", { replace: true });
            })
            .catch(() => navigate("/?error=github_session", { replace: true }));
    }, [login, navigate]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-4">
                <span className="w-6 h-6 rounded-full border-2 border-white/10 border-t-white animate-spin" />
                <p className="text-white/40 text-xs font-mono tracking-[0.2em] uppercase">
                    Conectando ao GitHub…
                </p>
            </div>
        </div>
    );
}
