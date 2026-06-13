import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import { api } from '../services/api';
import type { ContributionsResponse } from '../types/database';

export default function ContributorsPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const repositoryId = searchParams.get('repository_id');

    const [data, setData] = useState<ContributionsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!repositoryId) {
            navigate('/graviton-home');
            return;
        }

        const fetchContributions = async () => {
            try {
                const res = await api.get(`/contributions?repository_id=${repositoryId}`);
                setData(res.data);
            } catch (err) {
                const e = err as AxiosError;
                if (e.response?.status === 401) {
                    navigate('/');
                    return;
                }
                setError('Não foi possível carregar os contribuidores.');
                console.error('Erro ao buscar contributions:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchContributions();
    }, [repositoryId, navigate]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <p className="text-gray-600 animate-pulse font-mono text-sm">Carregando contribuidores...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <p className="text-red-500 font-mono text-sm">{error ?? 'Dados não encontrados.'}</p>
            </div>
        );
    }

    const { repository, total_commits, contributions } = data;

    return (
        <div className="flex min-h-screen w-full flex-col bg-black p-12">
            <header className="flex flex-col gap-2 mb-8">
                <button
                    onClick={() => navigate('/graviton-home')}
                    className="text-gray-600 hover:text-white font-mono text-xs underline underline-offset-4 self-start mb-2 transition-colors"
                >
                    ← Voltar aos repositórios
                </button>
                <h1 className="font-black text-white tracking-tighter text-2xl">
                    {repository.github_owner}/{repository.github_repo}
                    <span className="text-gray-600">.</span>
                </h1>
                <div className="flex items-center gap-6 mt-1">
                    <span className="font-mono text-xs text-gray-600">
                        {contributions.length} contribuidor{contributions.length !== 1 ? 'es' : ''}
                    </span>
                    <span className="font-mono text-xs text-gray-600">
                        {total_commits.toLocaleString('pt-BR')} commits totais
                    </span>
                </div>
                <div className="mt-2 h-1 w-16 bg-white rounded-full" />
            </header>

            <div className="overflow-x-auto rounded-2xl border border-white/[0.07]">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                            <th className="px-6 py-4 text-xs font-bold tracking-widest text-gray-600 uppercase">Contribuidor</th>
                            <th className="px-6 py-4 text-xs font-bold tracking-widest text-gray-600 uppercase">Commits</th>
                            <th className="px-6 py-4 text-xs font-bold tracking-widest text-gray-600 uppercase">Gravidade</th>
                            <th className="px-6 py-4 text-xs font-bold tracking-widest text-gray-600 uppercase">Empresa</th>
                            <th className="px-6 py-4 text-xs font-bold tracking-widest text-gray-600 uppercase">Localização</th>
                            <th className="px-6 py-4 text-xs font-bold tracking-widest text-gray-600 uppercase">Disponível</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contributions.map((c, i) => (
                            <tr
                                key={c.id}
                                className={`border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'}`}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={c.contributor.avatar_url}
                                            alt={c.contributor.username}
                                            className="h-9 w-9 rounded-full border border-white/10 object-cover"
                                        />
                                        <span className="font-semibold text-white">{c.contributor.username}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="font-black text-white tabular-nums">
                                        {c.commits_count.toLocaleString('pt-BR')}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-purple-400"
                                                style={{ width: `${c.gravity * 100}%` }}
                                            />
                                        </div>
                                        <span className="font-mono text-xs text-gray-500 tabular-nums">
                                            {(c.gravity * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-mono text-sm text-gray-500">
                                    {c.contributor.company ?? <span className="text-gray-700">—</span>}
                                </td>
                                <td className="px-6 py-4 font-mono text-sm text-gray-500">
                                    {c.contributor.location ?? <span className="text-gray-700">—</span>}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                                        c.contributor.hireable
                                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                            : 'bg-white/5 text-gray-600 border-white/[0.07]'
                                    }`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${c.contributor.hireable ? 'bg-purple-400' : 'bg-gray-700'}`} />
                                        {c.contributor.hireable ? 'Disponível' : 'Alocado'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
