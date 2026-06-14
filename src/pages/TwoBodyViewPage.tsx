import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { api } from '../services/api';
import type { ContributionsResponse } from '../types/database';
import DualGlobe from '../components/DualGlobe';
import '../index.css';

function Stars() {
    const stars = useMemo(() =>
        Array.from({ length: 140 }, (_, i) => ({
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
                <div key={s.id} className="absolute rounded-full bg-white"
                    style={{
                        left: `${s.x}%`, top: `${s.y}%`,
                        width: `${s.size}px`, height: `${s.size}px`,
                        animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
                    }}
                />
            ))}
        </div>
    );
}

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
    const [msgIndex, setMsgIndex] = useState(0);

    useEffect(() => {
        if (!loading) return;
        const id = setInterval(() => setMsgIndex(i => (i + 1) % TWO_BODY_MSGS.length), 700);
        return () => clearInterval(id);
    }, [loading]);

    useEffect(() => {
        if (!primaryId || !secondaryId) { navigate('/dois-corpos'); return; }

        Promise.all([
            api.get(`/contributions?repository_id=${primaryId}`),
            api.get(`/contributions?repository_id=${secondaryId}`),
        ])
            .then(([r1, r2]) => setData({ primary: r1.data, secondary: r2.data }))
            .catch((err: AxiosError) => {
                if (err.response?.status === 401) { navigate('/'); return; }
                setError('Não foi possível carregar os dados do sistema.');
            })
            .finally(() => setLoading(false));
    }, [primaryId, secondaryId, navigate]);

    if (loading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-black p-12 text-center gap-10">
                <div className="relative flex items-center justify-center">
                    <div className="absolute h-48 w-48 rounded-full border border-purple-500/10 animate-ping" style={{ animationDuration: '2.5s' }} />
                    <div className="absolute h-36 w-36 rounded-full border border-purple-500/15 animate-ping" style={{ animationDuration: '2s' }} />
                    <div className="absolute h-24 w-24 rounded-full bg-purple-500/10 animate-pulse" />
                    <div className="relative h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-[0_0_60px_rgba(168,85,247,0.4)]">
                        <div className="h-7 w-7 rounded-full bg-black border-2 border-dashed border-purple-500 animate-spin" style={{ animationDuration: '1.5s' }} />
                    </div>
                </div>
                <div className="flex flex-col gap-3">
                    <h2 className="font-extrabold text-white tracking-tighter text-xl uppercase">
                        Gerando sistema de dois corpos
                    </h2>
                    <p className="text-gray-500 font-mono text-sm animate-pulse" style={{ minHeight: '1.25rem' }}>
                        {TWO_BODY_MSGS[msgIndex]}
                    </p>
                </div>
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
