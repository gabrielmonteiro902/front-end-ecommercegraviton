import '../index.css';
import { useEffect, useState, useRef } from 'react';
import Stars from '../components/Stars';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { Plus, ArrowRight, Trash2, Check } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Repository } from '../types/database';

type DeleteTarget =
    | { mode: 'single'; id: string }
    | { mode: 'bulk'; ids: string[] }
    | { mode: 'bulk-partial'; ids: string[]; syncingCount: number };

type Toast = { type: 'success' | 'error'; message: string };

// ─── Background ───────────────────────────────────────────────────────────────

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

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectionMode, setSelectionMode] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [toast, setToast] = useState<Toast | null>(null);
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const showToast = (type: 'success' | 'error', message: string) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast({ type, message });
        toastTimerRef.current = setTimeout(() => setToast(null), 4500);
    };

    const toggleSelectionMode = () => {
        setSelectionMode(prev => !prev);
        setSelectedIds(new Set());
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const openDeleteSingle = (id: string) => {
        setDeleteError(null);
        setDeleteTarget({ mode: 'single', id });
    };

    const openDeleteBulk = () => {
        setDeleteError(null);
        setDeleteTarget({ mode: 'bulk', ids: Array.from(selectedIds) });
    };

    const closeModal = () => {
        setDeleteTarget(null);
        setDeleteError(null);
    };

    const executeDelete = async (target: DeleteTarget) => {
        setDeleting(true);
        setDeleteError(null);
        try {
            if (target.mode === 'single') {
                const res = await api.delete<{ message: string; deleted_contributions: number }>(
                    `/repositories/${target.id}`
                );
                setRepos(prev => prev.filter(r => r.id !== target.id));
                closeModal();
                showToast('success', `Repositório removido. ${res.data.deleted_contributions} contribuição(ões) apagada(s).`);
            } else {
                const res = await api.delete<{ message: string; deleted_repositories: number; deleted_contributions: number }>(
                    '/repositories',
                    { data: { ids: target.ids } }
                );
                setRepos(prev => prev.filter(r => !target.ids.includes(r.id)));
                setSelectedIds(new Set());
                setSelectionMode(false);
                closeModal();
                showToast('success', `${res.data.deleted_repositories} repositório(s) removido(s). ${res.data.deleted_contributions} contribuição(ões) apagada(s).`);
            }
        } catch (err) {
            const e = err as AxiosError<{ error?: string; syncing_ids?: string[]; not_found_ids?: string[] }>;
            const data = e.response?.data;
            const status = e.response?.status;

            if (status === 409) {
                if (target.mode === 'single') {
                    setDeleteError(data?.error ?? 'Repositório está sendo sincronizado.');
                } else {
                    const syncingIds = data?.syncing_ids ?? [];
                    const remainingIds = target.ids.filter(id => !syncingIds.includes(id));
                    if (remainingIds.length > 0) {
                        setDeleteTarget({ mode: 'bulk-partial', ids: remainingIds, syncingCount: syncingIds.length });
                    } else {
                        setDeleteError(data?.error ?? 'Todos os repositórios selecionados estão sendo sincronizados.');
                    }
                }
            } else if (status === 404) {
                const notFoundIds = data?.not_found_ids ?? [];
                if (target.mode === 'single') {
                    setRepos(prev => prev.filter(r => r.id !== target.id));
                } else {
                    setRepos(prev => prev.filter(r => !notFoundIds.includes(r.id)));
                    setSelectedIds(new Set());
                    setSelectionMode(false);
                }
                closeModal();
                showToast('success', 'Repositório(s) não encontrado(s) — removidos da lista.');
            } else {
                setDeleteError(data?.error ?? 'Erro ao excluir repositório(s).');
            }
        } finally {
            setDeleting(false);
        }
    };

    const modalMessage = (() => {
        if (!deleteTarget) return '';
        switch (deleteTarget.mode) {
            case 'single':
                return 'Tem certeza? Todas as contribuições associadas serão removidas permanentemente.';
            case 'bulk':
                return `Tem certeza que deseja excluir ${deleteTarget.ids.length} repositório(s)? Todas as contribuições associadas serão removidas permanentemente.`;
            case 'bulk-partial':
                return `${deleteTarget.syncingCount} repositório(s) estão sendo sincronizados e não podem ser excluídos. Deseja excluir os outros ${deleteTarget.ids.length}?`;
        }
    })();

    const confirmLabel = (() => {
        if (!deleteTarget) return 'Excluir';
        switch (deleteTarget.mode) {
            case 'single': return 'Excluir';
            case 'bulk': return `Excluir ${deleteTarget.ids.length}`;
            case 'bulk-partial': return `Excluir os outros ${deleteTarget.ids.length}`;
        }
    })();

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
            <Stars count={100} />

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
                        {repos.length > 0 && (
                            <div className="flex items-center gap-3 shrink-0">
                                {selectionMode && selectedIds.size > 0 && (
                                    <button
                                        onClick={openDeleteBulk}
                                        className="flex items-center gap-1.5 text-[9px] font-mono tracking-[0.2em] text-red-400/70 uppercase hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 size={10} />
                                        excluir {selectedIds.size}
                                    </button>
                                )}
                                <button
                                    onClick={toggleSelectionMode}
                                    className="text-[9px] font-mono tracking-[0.2em] text-white/20 uppercase hover:text-white/40 transition-colors"
                                >
                                    {selectionMode ? 'cancelar' : 'selecionar'}
                                </button>
                            </div>
                        )}
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
                                    className={`group flex items-center justify-between rounded-2xl border px-6 py-5 transition-all ${
                                        selectedIds.has(repo.id)
                                            ? 'border-white/[0.15] bg-white/[0.05]'
                                            : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.13]'
                                    }`}
                                >
                                    <div className="flex items-center gap-5">
                                        {selectionMode && (
                                            <button
                                                onClick={() => toggleSelection(repo.id)}
                                                className={`w-4 h-4 rounded border transition-all shrink-0 flex items-center justify-center ${
                                                    selectedIds.has(repo.id)
                                                        ? 'border-white/50 bg-white/20'
                                                        : 'border-white/15 hover:border-white/30'
                                                }`}
                                            >
                                                {selectedIds.has(repo.id) && <Check size={10} className="text-white/80" />}
                                            </button>
                                        )}
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

                                        {repo.status !== 'syncing' && !selectionMode && (
                                            <button
                                                onClick={() => openDeleteSingle(repo.id)}
                                                className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-8 h-8 rounded-xl border border-white/[0.07] text-white/25 hover:text-red-400/80 hover:border-red-500/20 hover:bg-red-500/[0.06] transition-all"
                                                title="Excluir repositório"
                                            >
                                                <Trash2 size={13} />
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

            {/* ── Delete confirmation modal ── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="w-full max-w-sm mx-4 rounded-2xl border border-white/[0.1] bg-[#080808] shadow-[0_0_80px_rgba(255,255,255,0.04),inset_0_1px_0_rgba(255,255,255,0.05)]">
                        <div className="px-6 py-4 border-b border-white/[0.06]">
                            <p className="text-[10px] font-black tracking-[0.28em] text-white/35 uppercase">
                                Confirmar Exclusão
                            </p>
                        </div>
                        <div className="p-6 flex flex-col gap-5">
                            <p className="text-sm text-white/60 leading-relaxed font-mono">
                                {modalMessage}
                            </p>
                            {deleteError && (
                                <div className="flex items-center gap-2.5 rounded-lg border border-red-500/20 bg-red-500/[0.05] px-4 py-3">
                                    <div className="w-1 h-1 rounded-full bg-red-400/60 shrink-0" />
                                    <span className="text-xs text-red-400/80 font-mono">{deleteError}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-end gap-3">
                                <button
                                    onClick={closeModal}
                                    disabled={deleting}
                                    className="px-5 py-2.5 rounded-xl border border-white/10 text-xs font-black text-white/40 tracking-[0.1em] uppercase hover:bg-white/[0.04] hover:text-white/60 transition-all disabled:opacity-30"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => executeDelete(deleteTarget)}
                                    disabled={deleting}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-xs font-black text-red-400 tracking-[0.1em] uppercase hover:bg-red-500/20 hover:border-red-500/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    {deleting
                                        ? <span className="w-3 h-3 rounded-full border-2 border-red-400/20 border-t-red-400/60 animate-spin" />
                                        : <Trash2 size={11} />
                                    }
                                    {confirmLabel}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast ── */}
            {toast && (
                <div className={`fixed bottom-8 right-8 z-50 flex items-center gap-3 rounded-2xl border px-5 py-4 shadow-2xl backdrop-blur-xl ${
                    toast.type === 'success'
                        ? 'border-green-500/20 bg-green-500/[0.07] text-green-400/90'
                        : 'border-red-500/20 bg-red-500/[0.07] text-red-400/90'
                }`}>
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className="text-xs font-mono">{toast.message}</span>
                </div>
            )}

        </div>
    );
}
