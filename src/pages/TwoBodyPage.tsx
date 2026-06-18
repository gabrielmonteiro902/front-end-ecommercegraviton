import '../index.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { Plus, ChevronDown, ChevronUp, Trash2, ArrowRight, Save } from 'lucide-react';
import { api, toArrayResponse } from '../services/api';
import Stars from '../components/Stars';
import type { Repository, OrbitConnection } from '../types/database';

const statusColor: Record<Repository['status'], string> = {
    syncing: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    active:  'bg-green-500/10  text-green-400  border-green-500/20',
    error:   'bg-red-500/10    text-red-400    border-red-500/20',
};
const statusLabel: Record<Repository['status'], string> = {
    syncing: 'Sincronizando', active: 'Ativo', error: 'Erro',
};

export default function TwoBodyPage() {
    const navigate = useNavigate();

    const [repos, setRepos]                   = useState<Repository[]>([]);
    const [connections, setConnections]       = useState<OrbitConnection[]>([]);
    const [loading, setLoading]               = useState(true);
    const [primaryId, setPrimaryId]           = useState('');
    const [secondaryId, setSecondaryId]       = useState('');

    // Save form
    const [showSaveForm, setShowSaveForm]     = useState(false);
    const [saveName, setSaveName]             = useState('');
    const [saving, setSaving]                 = useState(false);
    const [saveError, setSaveError]           = useState<string | null>(null);

    // Delete
    const [deletingId, setDeletingId]         = useState<string | null>(null);

    // Add repo form
    const [showAddForm, setShowAddForm]       = useState(false);
    const [addUrl, setAddUrl]                 = useState('');
    const [adding, setAdding]                 = useState(false);
    const [addError, setAddError]             = useState<string | null>(null);

    const activeRepos = repos.filter(r => r.status === 'active');

    const fetchAll = async () => {
        try {
            const [reposRes, connRes] = await Promise.all([
                api.get('/repositories'),
                api.get('/orbit-connections'),
            ]);
            setRepos(toArrayResponse<Repository>(reposRes.data));
            setConnections(toArrayResponse<OrbitConnection>(connRes.data));
        } catch (err) {
            const e = err as AxiosError;
            if (e.response?.status === 401) navigate('/');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleAddRepo = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddError(null);
        setAdding(true);
        try {
            await api.post('/repositories', { github_url: addUrl });
            setAddUrl('');
            await fetchAll();
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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaveError(null);
        setSaving(true);
        try {
            await api.post('/orbit-connections', {
                primary_repository_id: primaryId,
                secondary_repository_id: secondaryId,
                name: saveName.trim() || null,
            });
            setSaveName('');
            setShowSaveForm(false);
            await fetchAll();
        } catch (err) {
            const e = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
            const data = e.response?.data;
            setSaveError(data?.errors
                ? Object.values(data.errors).flat().join(' | ')
                : data?.message ?? 'Erro ao salvar conexão.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            await api.delete(`/orbit-connections/${id}`);
            setConnections(prev => prev.filter(c => c.id !== id));
        } catch {
            // silently ignore
        } finally {
            setDeletingId(null);
        }
    };

    const canVisualize = primaryId && secondaryId && primaryId !== secondaryId;

    // Check if this exact pair is already saved
    const alreadySaved = connections.some(
        c => c.primary_repository.id === primaryId && c.secondary_repository.id === secondaryId,
    );

    const handleVisualize = () => {
        navigate(`/dois-corpos/view?primary_id=${primaryId}&secondary_id=${secondaryId}`);
    };

    return (
        <div className="relative min-h-screen bg-black overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-15%] right-[5%] w-[500px] h-[500px] rounded-full bg-white/[0.015] blur-[150px]" />
                <div className="absolute bottom-[-10%] left-[0%] w-[380px] h-[380px] rounded-full bg-white/[0.01] blur-[120px]" />
                <div className="absolute top-[30%] left-[20%] w-[300px] h-[300px] rounded-full bg-purple-900/10 blur-[120px]" />
            </div>
            <div className="absolute inset-0 grid-bg pointer-events-none" />
            <Stars />

            <div className="relative z-20 flex flex-col min-h-screen px-10 py-8">

                {/* Title */}
                <div className="mb-10">
                    <p className="text-[10px] font-bold tracking-[0.3em] text-white/20 uppercase mb-2">
                        Mecânica Gravitacional
                    </p>
                    <h2 className="text-[3rem] font-black text-white tracking-tighter leading-[1.0]">
                        DOIS<br />
                        <span className="text-white/15">// </span>
                        <span className="text-white/40">CORPOS</span>
                    </h2>
                    <p className="text-[11px] font-mono text-white/20 mt-3 max-w-sm leading-relaxed">
                        Selecione dois repositórios para visualizar o sistema gravitacional entre eles.
                    </p>
                </div>

                {/* ── Saved connections ── */}
                {(loading || connections.length > 0) && (
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-3">
                            <p className="text-[9px] font-mono tracking-[0.25em] text-white/20 uppercase shrink-0">
                                Conexões salvas
                            </p>
                            <div className="flex-1 h-px bg-white/[0.05]" />
                        </div>

                        {loading ? (
                            <div className="flex items-center gap-3 py-4">
                                <span className="w-4 h-4 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
                                <p className="text-white/25 font-mono text-xs tracking-[0.2em] uppercase">Carregando...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {connections.map(conn => (
                                    <div
                                        key={conn.id}
                                        className="group flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-4 hover:bg-white/[0.04] hover:border-white/[0.12] transition-all"
                                    >
                                        {/* Info */}
                                        <div className="flex items-center gap-4 min-w-0">
                                            {conn.name && (
                                                <span className="font-black text-white/70 text-sm tracking-tight shrink-0">
                                                    {conn.name}
                                                </span>
                                            )}
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                                                    <span className="font-mono text-xs text-white/40 truncate">
                                                        {conn.primary_repository.github_owner}/{conn.primary_repository.github_repo}
                                                    </span>
                                                </div>
                                                <span className="text-white/15 font-mono text-xs shrink-0">→</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                                                    <span className="font-mono text-xs text-white/40 truncate">
                                                        {conn.secondary_repository.github_owner}/{conn.secondary_repository.github_repo}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 shrink-0 ml-4">
                                            <button
                                                onClick={() => navigate(`/dois-corpos/view?primary_id=${conn.primary_repository.id}&secondary_id=${conn.secondary_repository.id}`)}
                                                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black text-white tracking-[0.12em] uppercase hover:bg-white/10 hover:border-white/20 transition-all"
                                            >
                                                Abrir
                                                <ArrowRight size={10} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(conn.id)}
                                                disabled={deletingId === conn.id}
                                                className="p-1.5 text-white/15 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/[0.08] disabled:opacity-40"
                                                title="Remover conexão"
                                            >
                                                {deletingId === conn.id
                                                    ? <span className="w-3.5 h-3.5 rounded-full border border-white/20 border-t-white/50 animate-spin block" />
                                                    : <Trash2 size={14} />
                                                }
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Selector grid ── */}
                <div className="flex items-center gap-3 mb-4">
                    <p className="text-[9px] font-mono tracking-[0.25em] text-white/20 uppercase shrink-0">
                        Nova seleção
                    </p>
                    <div className="flex-1 h-px bg-white/[0.05]" />
                </div>

                <div className="flex flex-col lg:flex-row items-stretch gap-4 mb-6">

                    {/* Corpo A */}
                    <div className="flex-1 border border-white/[0.08] bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-green-400" />
                            <p className="text-[10px] font-black tracking-[0.28em] text-white/35 uppercase">
                                Corpo A — Principal
                            </p>
                        </div>
                        <div className="p-4">
                            {loading ? (
                                <div className="h-12 flex items-center px-2">
                                    <span className="w-4 h-4 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
                                </div>
                            ) : activeRepos.length === 0 ? (
                                <p className="text-white/20 font-mono text-xs px-2">Nenhum repositório ativo.</p>
                            ) : (
                                <div className="flex flex-col gap-1.5">
                                    {repos.map(repo => (
                                        <button
                                            key={repo.id}
                                            disabled={repo.status !== 'active'}
                                            onClick={() => { setPrimaryId(repo.id); if (secondaryId === repo.id) setSecondaryId(''); setShowSaveForm(false); }}
                                            className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all text-left ${
                                                primaryId === repo.id
                                                    ? 'border-green-500/40 bg-green-500/[0.07]'
                                                    : repo.status !== 'active'
                                                    ? 'border-white/[0.04] bg-white/[0.01] opacity-40 cursor-not-allowed'
                                                    : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.13]'
                                            }`}
                                        >
                                            <span className="font-black text-white text-sm tracking-tight">
                                                <span className="text-white/35">{repo.github_owner}</span>
                                                <span className="text-white/20 mx-1">/</span>
                                                {repo.github_repo}
                                            </span>
                                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black tracking-[0.12em] uppercase shrink-0 ${statusColor[repo.status]}`}>
                                                <span className={`h-1 w-1 rounded-full ${repo.status === 'active' ? 'bg-green-400' : repo.status === 'syncing' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'}`} />
                                                {statusLabel[repo.status]}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Center connector */}
                    <div className="flex lg:flex-col items-center justify-center px-2 py-4 lg:py-0 gap-3 lg:gap-2 shrink-0">
                        <div className="flex-1 lg:flex-none h-px lg:h-8 lg:w-px bg-white/[0.06]" />
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-8 h-8 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center">
                                <span className="font-mono text-white/20 text-[10px]">↔</span>
                            </div>
                            <span className="text-[8px] font-mono tracking-[0.2em] text-white/15 uppercase hidden lg:block">órbita</span>
                        </div>
                        <div className="flex-1 lg:flex-none h-px lg:h-8 lg:w-px bg-white/[0.06]" />
                    </div>

                    {/* Corpo B */}
                    <div className="flex-1 border border-white/[0.08] bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-purple-400" />
                            <p className="text-[10px] font-black tracking-[0.28em] text-white/35 uppercase">
                                Corpo B — Secundário
                            </p>
                        </div>
                        <div className="p-4">
                            {loading ? (
                                <div className="h-12 flex items-center px-2">
                                    <span className="w-4 h-4 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
                                </div>
                            ) : activeRepos.length === 0 ? (
                                <p className="text-white/20 font-mono text-xs px-2">Nenhum repositório ativo.</p>
                            ) : (
                                <div className="flex flex-col gap-1.5">
                                    {repos.map(repo => (
                                        <button
                                            key={repo.id}
                                            disabled={repo.status !== 'active' || repo.id === primaryId}
                                            onClick={() => { setSecondaryId(repo.id); setShowSaveForm(false); }}
                                            className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all text-left ${
                                                secondaryId === repo.id
                                                    ? 'border-purple-500/40 bg-purple-500/[0.07]'
                                                    : repo.status !== 'active' || repo.id === primaryId
                                                    ? 'border-white/[0.04] bg-white/[0.01] opacity-40 cursor-not-allowed'
                                                    : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.13]'
                                            }`}
                                        >
                                            <span className="font-black text-white text-sm tracking-tight">
                                                <span className="text-white/35">{repo.github_owner}</span>
                                                <span className="text-white/20 mx-1">/</span>
                                                {repo.github_repo}
                                            </span>
                                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black tracking-[0.12em] uppercase shrink-0 ${statusColor[repo.status]}`}>
                                                <span className={`h-1 w-1 rounded-full ${repo.status === 'active' ? 'bg-green-400' : repo.status === 'syncing' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'}`} />
                                                {statusLabel[repo.status]}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Save form (inline, appears when both selected) ── */}
                {canVisualize && !alreadySaved && (
                    <div className="mb-4 border border-white/[0.06] rounded-2xl overflow-hidden">
                        <button
                            onClick={() => setShowSaveForm(v => !v)}
                            className="w-full flex items-center justify-between px-6 py-3.5 text-white/30 hover:text-white/50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <Save size={12} />
                                <span className="text-[10px] font-black tracking-[0.25em] uppercase">
                                    Salvar esta conexão
                                </span>
                            </div>
                            {showSaveForm ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>

                        {showSaveForm && (
                            <div className="border-t border-white/[0.06] p-5">
                                <form onSubmit={handleSave} className="flex gap-3">
                                    <input
                                        type="text"
                                        placeholder="Nome da conexão (opcional)"
                                        value={saveName}
                                        onChange={e => setSaveName(e.target.value)}
                                        maxLength={80}
                                        className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-sm placeholder:text-white/20 outline-none focus:border-white/25 focus:bg-white/[0.07] transition-all"
                                    />
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex items-center gap-2 px-5 rounded-xl bg-white/10 border border-white/10 text-white text-xs font-black tracking-[0.15em] uppercase hover:bg-white/15 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        {saving
                                            ? <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                                            : <><Save size={13} />Salvar</>
                                        }
                                    </button>
                                </form>
                                {saveError && (
                                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.05] px-4 py-2.5">
                                        <span className="text-xs text-red-400/70 font-mono">{saveError}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {canVisualize && alreadySaved && (
                    <p className="mb-4 text-[10px] font-mono text-white/15 tracking-[0.15em] uppercase">
                        ✓ Conexão já salva
                    </p>
                )}

                {/* ── Add repo collapsible ── */}
                <div className="mb-6 border border-white/[0.06] rounded-2xl overflow-hidden">
                    <button
                        onClick={() => setShowAddForm(v => !v)}
                        className="w-full flex items-center justify-between px-6 py-4 text-white/30 hover:text-white/50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Plus size={13} />
                            <span className="text-[10px] font-black tracking-[0.25em] uppercase">
                                Adicionar novo repositório
                            </span>
                        </div>
                        {showAddForm ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>

                    {showAddForm && (
                        <div className="border-t border-white/[0.06] p-6">
                            <form onSubmit={handleAddRepo} className="flex gap-3">
                                <input
                                    type="url"
                                    placeholder="https://github.com/usuario/repositorio"
                                    value={addUrl}
                                    onChange={e => setAddUrl(e.target.value)}
                                    required
                                    className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm placeholder:text-white/20 outline-none focus:border-white/25 focus:bg-white/[0.07] transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={adding}
                                    className="flex items-center gap-2 px-6 rounded-xl bg-white text-black text-xs font-black tracking-[0.15em] uppercase hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    {adding
                                        ? <span className="w-4 h-4 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                                        : <><Plus size={14} />Adicionar</>
                                    }
                                </button>
                            </form>
                            {addError && (
                                <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                                    <div className="w-1 h-1 rounded-full bg-white/40 shrink-0" />
                                    <span className="text-xs text-white/50 font-mono">{addError}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Visualize button ── */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleVisualize}
                        disabled={!canVisualize}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-black font-black text-sm tracking-[0.18em] uppercase hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                    >
                        Iniciar sistema gravitacional
                        <span className="text-black/40 font-mono text-xs">→</span>
                    </button>
                    {!canVisualize && !loading && activeRepos.length >= 2 && (
                        <p className="text-[10px] font-mono text-white/20 tracking-[0.15em] uppercase">
                            Selecione os dois corpos para continuar
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-auto pt-10 border-t border-white/[0.04]">
                    <p className="text-[9px] font-mono text-white/10 tracking-[0.15em] uppercase">
                        GRV-SYS // DOIS-CORPOS // PROBLEMA GRAVITACIONAL // v1.0
                    </p>
                </div>
            </div>
        </div>
    );
}
