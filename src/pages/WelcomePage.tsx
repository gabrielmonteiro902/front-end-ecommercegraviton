import "../index.css";
import { useState } from "react";
import Stars from "../components/Stars";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { api } from "../services/api";
import WelcomeGlobe from "../components/WelcomeGlobe";
import GravitonLogo from "../components/GravitonLogo";

type Mode = "login" | "register";

// ─── Stars ───────────────────────────────────────────────────────────────────

// ─── Scanline ────────────────────────────────────────────────────────────────
function Scanline() {
    return (
        <div
            className="absolute left-0 right-0 h-32 pointer-events-none z-10"
            style={{
                background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.03), transparent)",
                animation: "scanline 8s linear 2s infinite",
            }}
        />
    );
}

// ─── Input ───────────────────────────────────────────────────────────────────
function Input({ label, type = "text", placeholder, value, onChange }: {
    label: string; type?: string; placeholder: string; value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/35">
                {label}
            </label>
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/20 outline-none focus:border-white/25 focus:bg-white/[0.07] transition-all"
            />
        </div>
    );
}

// ─── Password Input ───────────────────────────────────────────────────────────
function PasswordInput({ label, placeholder, value, onChange }: {
    label: string; placeholder: string; value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    const [show, setShow] = useState(false);
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/35">
                {label}
            </label>
            <div className="relative">
                <input
                    type={show ? "text" : "password"}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 pr-11 text-white text-sm placeholder:text-white/20 outline-none focus:border-white/25 focus:bg-white/[0.07] transition-all"
                />
                <button
                    type="button"
                    onClick={() => setShow(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/55 transition-colors"
                >
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
            </div>
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function WelcomePage() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [mode, setMode] = useState<Mode>("login");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Login fields
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");

    // Register fields
    const [regName, setRegName] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [regGithubUrl, setRegGithubUrl] = useState("");
    const [tenantName, setTenantName] = useState("");

    const generateTenantId = (name: string) => {
        const slug = name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
        const suffix = Math.random().toString(36).slice(2, 7);
        return `${slug}-${suffix}`;
    };

    const switchMode = (m: Mode) => { setMode(m); setError(""); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSubmitting(true);
        try {
            if (mode === "login") {
                const res = await api.post(
                    "/login",
                    { email_admin: loginEmail, password_admin: loginPassword }
                );
                login(res.data);
                navigate("/graviton-home");
            } else {
                const tenantId = generateTenantId(tenantName);
                const res = await api.post("/register", {
                    name_admin: regName,
                    email_admin: regEmail,
                    password_admin: regPassword,
                    github_url: regGithubUrl,
                    tenant_id: tenantId,
                    tenant_name: tenantName,
                    tenant_email: regEmail,
                });

                localStorage.setItem("graviton_tenant_id", res.data.tenant_id ?? tenantId);

                // Armazena o token antes de fazer chamadas autenticadas
                login(res.data);

                // Garante que o repositório inicial existe via endpoint dedicado
                // (o /register pode não processar o github_url automaticamente)
                let repoId: string | undefined = res.data?.repository?.id;
                if (!repoId && regGithubUrl) {
                    const repoRes = await api.post("/repositories", { github_url: regGithubUrl });
                    repoId = repoRes.data?.repository?.id;
                }

                if (repoId) {
                    navigate("/sync-loading", { state: { repoId } });
                } else {
                    navigate("/graviton-home");
                }
            }
        } catch (err) {
            if (!(err as AxiosError).isAxiosError) {
                console.error("Erro inesperado no frontend:", err);
                setError("Ocorreu um erro inesperado. Tente novamente.");
            } else {
                const axiosErr = err as AxiosError<{ message?: string; error?: string; errors?: Record<string, string[]> }>;
                const data = axiosErr.response?.data;

                if (!axiosErr.response) {
                    setError("Não foi possível conectar ao servidor. Tente novamente em instantes.");
                } else if (data?.errors) {
                    // Erros de validação (422) são seguros e úteis de exibir ao usuário.
                    const messages = Object.values(data.errors).flat().join(" | ");
                    setError(messages);
                } else {
                    setError(data?.message || data?.error || "Não foi possível concluir a operação. Tente novamente.");
                }
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="relative min-h-screen bg-black overflow-hidden flex">

            {/* Ambient glows */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-white/[0.02] blur-[140px]" />
                <div className="absolute bottom-[-10%] right-[15%] w-[400px] h-[400px] rounded-full bg-white/[0.015] blur-[120px]" />
            </div>

            {/* Grid texture */}
            <div className="absolute inset-0 grid-bg pointer-events-none" />

            {/* Scanline */}
            <Scanline />

            {/* Stars */}
            <Stars />

            {/* ── LEFT PANEL ── */}
            <div className="hidden lg:flex w-1/2 items-center justify-center p-16 relative z-20">
                <div className="flex flex-col gap-10 max-w-xs">

                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <GravitonLogo size={36} showRing={false} />
                        <span className="text-sm font-black tracking-[0.4em] text-white uppercase">
                            GRAVITON
                        </span>
                    </div>

                    {/* Headline */}
                    <div className="flex flex-col gap-1">
                        <p className="text-[10px] font-bold tracking-[0.3em] text-white/25 uppercase mb-2">
                            Sistema de Controle
                        </p>
                        <h1 className="text-[3.2rem] font-black text-white tracking-tighter leading-[1.0]">
                            INFRA<br />
                            <span className="text-white/15">// </span>ORBITAL<br />
                            <span className="text-white/40">SCALE</span>
                        </h1>
                    </div>

                    {/* Globe viz */}
                    <div className="w-full" style={{ height: '220px' }}>
                        <WelcomeGlobe />
                    </div>

                    {/* Telemetry */}
                    <div className="flex flex-col gap-2.5">
                        {[
                            { label: "Sistemas Online", delay: "0s" },
                            { label: "99.9% Uptime", delay: "0.7s" },
                            { label: "Orbital Class Security", delay: "1.4s" },
                        ].map(({ label, delay }) => (
                            <div key={label} className="flex items-center gap-2.5">
                                <div
                                    className="w-1.5 h-1.5 rounded-full bg-white"
                                    style={{ animation: `twinkle 2.5s ease-in-out ${delay} infinite` }}
                                />
                                <span className="text-[10px] font-mono tracking-[0.2em] text-white/25 uppercase">
                                    {label}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Coordinates */}
                    <div className="border-t border-white/[0.06] pt-5">
                        <p className="text-[9px] font-mono text-white/12 tracking-[0.12em] leading-relaxed">
                            SYS:GRV-01 // ORB:443<br />
                            STATUS:NOMINAL // SECURE
                        </p>
                    </div>
                </div>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="flex flex-1 lg:w-1/2 items-center justify-center p-6 relative z-20">
                <div className="w-full max-w-md">

                    {/* Mobile logo */}
                    <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
                        <GravitonLogo size={32} showRing={false} />
                        <span className="text-sm font-black tracking-[0.35em] text-white uppercase">
                            GRAVITON
                        </span>
                    </div>

                    {/* Auth card */}
                    <div className="border border-white/[0.08] bg-black/50 backdrop-blur-xl rounded-2xl overflow-hidden shadow-[0_0_100px_rgba(255,255,255,0.02),inset_0_1px_0_rgba(255,255,255,0.05)]">

                        {/* Tab bar */}
                        <div className="flex border-b border-white/[0.08]">
                            {(["login", "register"] as Mode[]).map(m => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => switchMode(m)}
                                    className={`flex-1 py-4 text-[11px] font-black tracking-[0.22em] uppercase transition-all duration-200 ${mode === m
                                            ? "bg-white text-black"
                                            : "text-white/25 hover:text-white/50 hover:bg-white/[0.03]"
                                        }`}
                                >
                                    {m === "login" ? "Entrar" : "Criar Sistema"}
                                </button>
                            ))}
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-4">
                            {mode === "login" ? (
                                <>
                                    <div className="mb-1">
                                        <h2 className="text-lg font-black text-white tracking-tight">
                                            Acesso ao Sistema
                                        </h2>
                                        <p className="text-xs text-white/25 mt-0.5 font-mono">
                                            Entre com as credenciais do seu sistema orbital
                                        </p>
                                    </div>
                                    <Input
                                        label="E-mail"
                                        type="email"
                                        placeholder="admin@sistema.com"
                                        value={loginEmail}
                                        onChange={e => setLoginEmail(e.target.value)}
                                    />
                                    <PasswordInput
                                        label="Senha"
                                        placeholder="••••••••"
                                        value={loginPassword}
                                        onChange={e => setLoginPassword(e.target.value)}
                                    />
                                </>
                            ) : (
                                <>
                                    <div className="mb-1">
                                        <h2 className="text-lg font-black text-white tracking-tight">
                                            Novo Sistema Orbital
                                        </h2>
                                        <p className="text-xs text-white/25 mt-0.5 font-mono">
                                            Configure sua infra no Graviton
                                        </p>
                                    </div>
                                    <Input
                                        label="Nome do Administrador"
                                        placeholder="Seu nome completo"
                                        value={regName}
                                        onChange={e => setRegName(e.target.value)}
                                    />
                                    <Input
                                        label="E-mail do Administrador"
                                        type="email"
                                        placeholder="admin@empresa.com"
                                        value={regEmail}
                                        onChange={e => setRegEmail(e.target.value)}
                                    />
                                    <Input
                                        label="Nome do Sistema Orbital"
                                        placeholder="Nome do seu Sistema Orbital"
                                        value={tenantName}
                                        onChange={e => setTenantName(e.target.value)}
                                    />
                                    <Input
                                        label="Repositório GitHub Inicial"
                                        type="url"
                                        placeholder="https://github.com/usuario/repositorio"
                                        value={regGithubUrl}
                                        onChange={e => setRegGithubUrl(e.target.value)}
                                    />
                                    <PasswordInput
                                        label="Senha de Acesso"
                                        placeholder="••••••••"
                                        value={regPassword}
                                        onChange={e => setRegPassword(e.target.value)}
                                    />
                                </>
                            )}

                            {/* Error */}
                            {error && (
                                <div className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                                    <div className="w-1 h-1 rounded-full bg-white/40 shrink-0" />
                                    <span className="text-xs text-white/50 font-mono">{error}</span>
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={submitting}
                                className="mt-1 w-full flex items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-black text-xs font-black tracking-[0.15em] uppercase hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(255,255,255,0.08)]"
                            >
                                {submitting ? (
                                    <span className="w-4 h-4 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                                ) : (
                                    <>
                                        {mode === "login" ? "Acessar Sistema" : "Criar Sistema"}
                                        <ArrowRight size={14} />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-[9px] text-white/12 font-mono mt-5 tracking-[0.2em] uppercase">
                        GRV-SYS // Secure Channel // v1.0
                    </p>
                </div>
            </div>

        </div>
    );
}
