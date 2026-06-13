import '../index.css';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { Plus, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Repository } from '../types/database';

// ─── Background ───────────────────────────────────────────────────────────────
function Stars() {
    const stars = useMemo(() =>
        Array.from({ length: 100 }, (_, i) => ({
            id: i,
            x: (i * 7.3 + 13.7) % 100,
            y: (i * 13.1 + 7.3) % 100,
            size: (i % 3) * 0.5 + 0.5,
            delay: (i * 0.41) % 5,
            dur: (i % 3) + 2.5,
        })), []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            {stars.map(s => (
                <div
                    key={s.id}
                    className="absolute rounded-full bg-white"
                    style={{
                        left: `${s.x}%`,
                        top: `${s.y}%`,
                        width: `${s.size}px`,
                        height: `${s.size}px`,
                        animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
                    }}
                />
            ))}
        </div>
    );
}

function Scanline() {
    return (
        <div
            className="absolute left-0 right-0 h-32 pointer-events-none z-10"
            style={{
                background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.03), transparent)',
                animation: 'scanline 8s linear 2s infinite',
            }}
        />
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
    const navigate = useNavigate();
    useAuth();

    const [repos, setRepos] = useState<Repository[]>([]);
    const [loadingRepos, setLoadingRepos] = useState(true);
    const [githubUrl, setGithubUrl] = useState('');
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);

    const fetchRepos = async () => {
        try {
            const res = await api.get('/repositories');
            setRepos(res.data);
        } catch (err) {
            const e = err as AxiosError;
            if (e.response?.status === 401) navigate('/');
        } finally {
            setLoadingRepos(false);
        }
    };

    useEffect(() => { fetchRepos(); }, []);

    const handleAddRepo = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddError(null);
        setAdding(true);
        try {
            await api.post('/repositories', { github_url: githubUrl });
            setGithubUrl('');
            await fetchRepos();
        } catch (err) {
            const e = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
            const data = e.response?.data;
            setAddError(data?.errors
                ? Object.values(data.errors).flat().join(' | ')
                : data?.message ?? 'Erro ao adicionar repositório.');
        } finally {
            setAdding(false);
        }
    };

    const statusLabel: Record<Repository['status'], string> = {
        syncing: 'Sincronizando',
        active:  'Ativo',
        error:   'Erro',
    };

    const statusColor: Record<Repository['status'], string> = {
        syncing: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        active:  'bg-green-500/10  text-green-400  border-green-500/20',
        error:   'bg-red-500/10    text-red-400    border-red-500/20',
    };

    return (
        <div className="relative min-h-screen bg-black overflow-hidden">

            {/* Ambient glows */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-15%] right-[5%]  w-[500px] h-[500px] rounded-full bg-white/[0.015] blur-[150px]" />
                <div className="absolute bottom-[-10%] left-[0%] w-[380px] h-[380px] rounded-full bg-white/[0.01]  blur-[120px]" />
            </div>

            {/* Grid + Scanline + Stars */}
            <div className="absolute inset-0 grid-bg pointer-events-none" />
            <Scanline />
            <Stars />

            {/* ── Content ── */}
            <div className="relative z-20 flex flex-col min-h-screen px-10 py-8">


                {/* Page title */}
                <div className="mb-10">
                    <p className="text-[10px] font-bold tracking-[0.3em] text-white/20 uppercase mb-2">
                        Projetos Monitorados
                    </p>
                    <h2 className="text-[3rem] font-black text-white tracking-tighter leading-[1.0]">
                        REPOS<br />
                        <span className="text-white/15">// </span>
                        <span className="text-white/40">ORBITAIS</span>
                    </h2>
                </div>

                {/* Add repository card */}
                <div className="mb-8 border border-white/[0.08] bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(255,255,255,0.02),inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <div className="px-6 py-4 border-b border-white/[0.06]">
                        <p className="text-[10px] font-black tracking-[0.28em] text-white/35 uppercase">
                            Adicionar Repositório
                        </p>
                    </div>
                    <form onSubmit={handleAddRepo} className="p-6 flex gap-3">
                        <input
                            type="url"
                            placeholder="https://github.com/usuario/repositorio"
                            value={githubUrl}
                            onChange={e => setGithubUrl(e.target.value)}
                            required
                            className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm placeholder:text-white/20 outline-none focus:border-white/25 focus:bg-white/[0.07] transition-all"
                        />
                        <button
                            type="submit"
                            disabled={adding}
                            className="flex items-center gap-2 px-6 rounded-xl bg-white text-black text-xs font-black tracking-[0.15em] uppercase hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(255,255,255,0.08)]"
                        >
                            {adding ? (
                                <span className="w-4 h-4 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                            ) : (
                                <>
                                    <Plus size={14} />
                                    Adicionar
                                </>
                            )}
                        </button>
                    </form>
                    {addError && (
                        <div className="px-6 pb-5">
                            <div className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                                <div className="w-1 h-1 rounded-full bg-white/40 shrink-0" />
                                <span className="text-xs text-white/50 font-mono">{addError}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Repos list */}
                <div className="flex-1">
                    {/* Section label */}
                    <div className="flex items-center gap-3 mb-4">
                        <p className="text-[9px] font-mono tracking-[0.25em] text-white/20 uppercase shrink-0">
                            {repos.length} sistema{repos.length !== 1 ? 's' : ''} conectado{repos.length !== 1 ? 's' : ''}
                        </p>
                        <div className="flex-1 h-px bg-white/[0.05]" />
                    </div>

                    {loadingRepos ? (
                        <div className="flex items-center gap-3 py-12">
                            <span className="w-4 h-4 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
                            <p className="text-white/25 font-mono text-xs tracking-[0.2em] uppercase">
                                Carregando sistemas...
                            </p>
                        </div>
                    ) : repos.length === 0 ? (
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
                            <p className="text-white/20 font-mono text-sm tracking-wider">
                                Nenhum repositório adicionado ainda.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {repos.map((repo, i) => (
                                <div
                                    key={repo.id}
                                    className="group flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.02] px-6 py-5 hover:bg-white/[0.04] hover:border-white/[0.13] transition-all"
                                >
                                    <div className="flex items-center gap-5">
                                        <span className="text-[10px] font-mono text-white/15 w-5 text-right shrink-0">
                                            {String(i + 1).padStart(2, '0')}
                                        </span>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-black text-white tracking-tight text-sm">
                                                <span className="text-white/35">{repo.github_owner}</span>
                                                <span className="text-white/20 mx-1">/</span>
                                                {repo.github_repo}
                                            </span>
                                            {repo.last_synced_at && (
                                                <span className="font-mono text-[10px] text-white/20">
                                                    sync — {new Date(repo.last_synced_at).toLocaleString('pt-BR')}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black tracking-[0.15em] uppercase ${statusColor[repo.status]}`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${
                                                repo.status === 'active'  ? 'bg-green-400' :
                                                repo.status === 'syncing' ? 'bg-yellow-400 animate-pulse' :
                                                'bg-red-400'
                                            }`} />
                                            {statusLabel[repo.status]}
                                        </span>

                                        {repo.status === 'active' && (
                                            <button
                                                onClick={() => navigate('/sync-loading', { state: { repoId: repo.id } })}
                                                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black text-white tracking-[0.15em] uppercase hover:bg-white/10 hover:border-white/20 transition-all"
                                            >
                                                Ver globo
                                                <ArrowRight size={11} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer telemetry */}
                <div className="mt-10 pt-5 border-t border-white/[0.04]">
                    <p className="text-[9px] font-mono text-white/10 tracking-[0.15em] uppercase">
                        GRV-SYS // ORB:443 // STATUS:NOMINAL // SECURE
                    </p>
                </div>

            </div>
        </div>
    );
}
