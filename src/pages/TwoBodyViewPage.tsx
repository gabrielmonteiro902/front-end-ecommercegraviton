import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { api, normalizeContributions } from '../services/api';
import type { ContributionsResponse } from '../types/database';
import DualGlobe from '../components/DualGlobe';
import Stars from '../components/Stars';
import OrbitalLoading from '../components/OrbitalLoading';
import '../index.css';

const TWO_BODY_MSGS = [
    'Iniciando campo gravitacional...',
    'Posicionando corpos celestes...',
    'Calculando força de atração mútua...',
    'Ajustando trajetórias orbitais...',
    'Construindo o sistema de dois corpos...',
];

export default function TwoBodyViewPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const primaryId = searchParams.get('primary_id');
    const secondaryId = searchParams.get('secondary_id');

    const [data, setData] = useState<{ primary: ContributionsResponse; secondary: ContributionsResponse } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!primaryId || !secondaryId) { navigate('/dois-corpos'); return; }

        Promise.all([
            api.get(`/contributions?repository_id=${primaryId}`),
            api.get(`/contributions?repository_id=${secondaryId}`),
        ])
            .then(([r1, r2]) => setData({ primary: normalizeContributions(r1.data), secondary: normalizeContributions(r2.data) }))
            .catch((err: AxiosError) => {
                if (err.response?.status === 401) { navigate('/'); return; }
                setError('Não foi possível carregar os dados do sistema.');
            })
            .finally(() => setLoading(false));
    }, [primaryId, secondaryId, navigate]);

    if (loading) return <OrbitalLoading title="Gerando sistema de dois corpos" messages={TWO_BODY_MSGS} />;

    if (error || !data) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <p className="text-red-500 font-mono text-sm">{error ?? 'Dados não encontrados.'}</p>
            </div>
        );
    }

    const { primary, secondary } = data;

    return (
        <div className="relative w-screen h-screen bg-black overflow-hidden">
            <Stars />

            <DualGlobe
                primaryContributions={primary.contributions}
                secondaryContributions={secondary.contributions}
            />

            {/* Top-left: Corpo A info */}
            <div className="absolute top-6 left-6 pointer-events-none select-none">
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="font-mono text-[9px] tracking-[0.25em] text-green-400/60 uppercase">Corpo A</span>
                </div>
                <p className="font-black text-white tracking-tighter text-lg leading-none">
                    {primary.repository.github_owner}
                    <span className="text-gray-600">/</span>
                    {primary.repository.github_repo}
                </p>
                <p className="font-mono text-xs text-gray-600 mt-1">
                    {primary.contributions.length} satélite{primary.contributions.length !== 1 ? 's' : ''}
                    &nbsp;·&nbsp;
                    {primary.total_commits.toLocaleString('pt-BR')} commits
                </p>
            </div>

            {/* Top-right: Corpo B info + back button */}
            <div className="absolute top-6 right-6 flex flex-col items-end gap-3 select-none">
                <button
                    onClick={() => navigate('/dois-corpos')}
                    className="text-gray-600 hover:text-white font-mono text-xs underline underline-offset-4 transition-colors"
                >
                    ← Dois Corpos
                </button>
                <div className="text-right pointer-events-none">
                    <div className="flex items-center justify-end gap-2 mb-1">
                        <span className="font-mono text-[9px] tracking-[0.25em] text-purple-400/60 uppercase">Corpo B</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    </div>
                    <p className="font-black text-white tracking-tighter text-lg leading-none">
                        {secondary.repository.github_owner}
                        <span className="text-gray-600">/</span>
                        {secondary.repository.github_repo}
                    </p>
                    <p className="font-mono text-xs text-gray-600 mt-1">
                        {secondary.contributions.length} satélite{secondary.contributions.length !== 1 ? 's' : ''}
                        &nbsp;·&nbsp;
                        {secondary.total_commits.toLocaleString('pt-BR')} commits
                    </p>
                </div>
            </div>

            {/* Bottom-left: legend */}
            <div className="absolute bottom-6 left-6 pointer-events-none select-none flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                    <p className="font-mono text-[9px] text-gray-700 uppercase tracking-widest mb-0.5">Corpo A</p>
                    {[
                        { color: '#39d353', label: 'Alta atividade' },
                        { color: '#006d32', label: 'Baixa atividade' },
                    ].map(item => (
                        <div key={item.label} className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }} />
                            <span className="font-mono text-[9px] text-gray-600">{item.label}</span>
                        </div>
                    ))}
                </div>
                <div className="flex flex-col gap-1.5">
                    <p className="font-mono text-[9px] text-gray-700 uppercase tracking-widest mb-0.5">Corpo B</p>
                    {[
                        { color: '#a78bfa', label: 'Alta atividade' },
                        { color: '#4a1070', label: 'Baixa atividade' },
                    ].map(item => (
                        <div key={item.label} className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }} />
                            <span className="font-mono text-[9px] text-gray-600">{item.label}</span>
                        </div>
                    ))}
                </div>

            </div>

            {/* Bottom-right: controls */}
            <p className="absolute bottom-6 right-6 font-mono text-[10px] text-gray-700 pointer-events-none select-none">
                Arraste para rotacionar · Scroll para zoom
            </p>
        </div>
    );
}
