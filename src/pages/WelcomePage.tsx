import "../index.css";
import Form from "../components/form";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { api } from "../services/api";

export default function WelcomePage() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [isLogin, setIsLogin] = useState<boolean>(false);

    // campos de login
    const [tenantId, setTenantId] = useState("");
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");

    // campos de criar tenant
    const [tenantSlug, setTenantSlug] = useState("");
    const [tenantName, setTenantName] = useState("");
    const [tenantEmail, setTenantEmail] = useState("");
    const [tenantPlan, setTenantPlan] = useState<"free" | "starter" | "pro" | "enterprise">("free");

    const [error, setError] = useState("");

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        try {
            if (isLogin) {
                const response = await api.post(
                    "/login",
                    { email_admin: loginEmail, password_admin: loginPassword, tenant_id: tenantId },
                    { headers: { "X-Tenant-ID": tenantId } }
                );
                login(response.data);
                navigate("/graviton-home");
            } else {
                await api.post("/tenants", {
                    id: tenantSlug,
                    name: tenantName,
                    email: tenantEmail,
                    plan: tenantPlan,
                });
                setIsLogin(true);
                setTenantId(tenantSlug);
                setLoginEmail(tenantEmail);
            }
        } catch (err) {
            const axiosErr = err as AxiosError<{ message?: string; error?: string }>;
            setError(
                axiosErr.response?.data?.message ||
                axiosErr.response?.data?.error ||
                "Erro de conexão"
            );
        }
    };

    return (
        <div className="flex min-h-screen w-full flex-col bg-black">
            <div className="items-start justify-start px-12 py-8">
                <h1 className="font-bold text-white tracking-tighter">
                    WELCOME TO GRAVITON SERVICES<span className="text-gray-600">.</span>
                </h1>
            </div>

            <div className="flex flex-1 items-center justify-center p-6">
                <Form
                    title={isLogin ? "Entrar na Loja" : "Criar Nova Loja"}
                    buttonLabel={isLogin ? "Acessar Sistema" : "Criar Loja"}
                    onSubmit={handleAuth}
                >
                    {isLogin ? (
                        <>
                            <Form.Input
                                label="ID da Loja"
                                placeholder="minha-loja"
                                value={tenantId}
                                onChange={(e) => setTenantId(e.target.value)}
                            />
                            <Form.Input
                                label="E-mail"
                                type="email"
                                placeholder="admin@loja.com"
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                            />
                            <Form.InputPassword
                                label="Senha"
                                placeholder="*******"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                            />
                        </>
                    ) : (
                        <>
                            <Form.Input
                                label="ID da Loja (slug)"
                                placeholder="minha-loja"
                                value={tenantSlug}
                                onChange={(e) => setTenantSlug(e.target.value)}
                            />
                            <Form.Input
                                label="Nome da Loja"
                                placeholder="Minha Loja"
                                value={tenantName}
                                onChange={(e) => setTenantName(e.target.value)}
                            />
                            <Form.Input
                                label="E-mail"
                                type="email"
                                placeholder="loja@email.com"
                                value={tenantEmail}
                                onChange={(e) => setTenantEmail(e.target.value)}
                            />
                            <Form.Select
                                label="Plano"
                                value={tenantPlan}
                                onChange={(e) => setTenantPlan(e.target.value as typeof tenantPlan)}
                                options={[
                                    { value: "free", label: "Free" },
                                    { value: "starter", label: "Starter" },
                                    { value: "pro", label: "Pro" },
                                    { value: "enterprise", label: "Enterprise" },
                                ]}
                            />
                        </>
                    )}

                    {error && (
                        <p className="text-sm text-red-500 text-center">{error}</p>
                    )}

                    <div className="mt-2 text-center">
                        <button
                            type="button"
                            onClick={() => { setIsLogin(!isLogin); setError(""); }}
                            className="text-sm text-gray-500 hover:text-white transition-all cursor-pointer underline underline-offset-4"
                        >
                            {isLogin
                                ? "Ainda não tem uma loja? Crie aqui"
                                : "Já possui uma conta? Voltar para o login"}
                        </button>
                    </div>
                </Form>
            </div>
        </div>
    );
}
