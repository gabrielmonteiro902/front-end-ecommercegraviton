import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { AxiosError } from 'axios';
import { api } from '../services/api';
import type { ContributionsResponse } from '../types/database';
import GravityGlobe from '../components/GravityGlobe';
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

export default function GlobePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const repositoryId = searchParams.get('repository_id');

  // SyncLoadingPage passes contributions via state to avoid a second fetch
  const [data, setData] = useState<ContributionsResponse | null>(
    location.state?.contributions ?? null
  );
  const [loading, setLoading] = useState(!location.state?.contributions);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data || !repositoryId) return;

    api.get(`/contributions?repository_id=${repositoryId}`)
      .then(res => setData(res.data))
      .catch((err: AxiosError) => {
        if (err.response?.status === 401) {
          navigate('/');
          return;
        }
        setError('Não foi possível carregar os dados do globo.');
      })
      .finally(() => setLoading(false));
  }, [repositoryId, data, navigate]);

  if (!repositoryId) {
    navigate('/graviton-home');
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <span className="w-5 h-5 rounded-full border-2 border-white/10 border-t-purple-400 animate-spin" />
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

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <Stars />
      <GravityGlobe contributions={data.contributions} />

      {/* Top-left: repo info */}
      <div className="absolute top-6 left-6 pointer-events-none select-none">
        <p className="font-black text-white tracking-tighter text-lg leading-none">
          {data.repository.github_owner}
          <span className="text-gray-600">/</span>
          {data.repository.github_repo}
        </p>
        <p className="font-mono text-xs text-gray-600 mt-1">
          {data.contributions.length} satélite{data.contributions.length !== 1 ? 's' : ''}
          &nbsp;·&nbsp;
          {data.total_commits.toLocaleString('pt-BR')} commits
        </p>
      </div>

      {/* Top-right: back button */}
      <button
        onClick={() => navigate('/graviton-home')}
        className="absolute top-6 right-6 text-gray-600 hover:text-white font-mono text-xs underline underline-offset-4 transition-colors"
      >
        ← Repositórios
      </button>

      {/* Bottom-left: legend */}
      <div className="absolute bottom-6 left-6 pointer-events-none select-none flex flex-col gap-1.5">
        <p className="font-mono text-[10px] text-gray-700 uppercase tracking-widest mb-1">Legenda</p>
        {[
          { color: '#39d353', label: 'Alta atividade' },
          { color: '#26a641', label: 'Média atividade' },
          { color: '#006d32', label: 'Baixa atividade' },
          { color: '#0e4429', label: 'Início de contribuição' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="font-mono text-[10px] text-gray-600">{item.label}</span>
          </div>
        ))}

      </div>

      {/* Bottom-right: controls hint */}
      <p className="absolute bottom-6 right-6 font-mono text-[10px] text-gray-700 pointer-events-none select-none">
        Arraste para rotacionar · Scroll para zoom
      </p>
    </div>
  );
}
