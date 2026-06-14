import '../index.css';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { api } from '../services/api';
import type { Repository, OrbitConnection, Contribution } from '../types/database';
import OrbitalSystem, { type PlanetData } from '../components/OrbitalSystem';

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
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
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

interface RepoData {
  total: number;
  contributions: Contribution[];
}

const ORBITAL_MSGS = [
  'Iniciando campo gravitacional...',
  'Mapeando repositórios ativos...',
  'Calculando órbitas do sistema...',
  'Posicionando planetas...',
  'Construindo o sistema orbital...',
];

export default function SolarSystemPage() {
  const navigate = useNavigate();
  const [planets, setPlanets] = useState<PlanetData[] | null>(null);
  const [accountName, setAccountName] = useState('GRAVITON');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setMsgIndex(i => (i + 1) % ORBITAL_MSGS.length), 700);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => {
    const load = async () => {
      try {
        const [reposRes, connRes, meRes] = await Promise.all([
          api.get('/repositories'),
          api.get('/orbit-connections'),
          api.get('/me').catch(() => ({ data: { name_admin: 'GRAVITON' } })),
        ]);

        const repos: Repository[] = reposRes.data;
        const connections: OrbitConnection[] = connRes.data;
        setAccountName((meRes.data.name_admin as string) ?? 'GRAVITON');

        const activeRepos = repos.filter(r => r.status === 'active');
        const secondaryIds = new Set(connections.map(c => c.secondary_repository.id));

        // All repo IDs we need contribution data for
        const allIds = [...new Set([
          ...activeRepos.map(r => r.id),
          ...connections.map(c => c.secondary_repository.id),
        ])];

        // Fetch full contributions for each repo in parallel
        const fetchResults = await Promise.all(
          allIds.map(id =>
            api.get(`/contributions?repository_id=${id}`)
              .then(res => ({
                id,
                total: (res.data.total_commits as number) ?? 0,
                contributions: (res.data.contributions as Contribution[]) ?? [],
              }))
              .catch((): { id: string; total: number; contributions: Contribution[] } =>
                ({ id, total: 0, contributions: [] })
              )
          ),
        );

        const dataById = new Map<string, RepoData>(
          fetchResults.map(r => [r.id, { total: r.total, contributions: r.contributions }])
        );

        // First orbit-connection per primary wins
        const primaryToSecondary = new Map<string, Repository>();
        for (const conn of connections) {
          if (!primaryToSecondary.has(conn.primary_repository.id)) {
            primaryToSecondary.set(conn.primary_repository.id, conn.secondary_repository);
          }
        }

        const empty: RepoData = { total: 0, contributions: [] };

        const built: PlanetData[] = activeRepos
          .filter(r => !secondaryIds.has(r.id))
          .map(r => {
            const data = dataById.get(r.id) ?? empty;
            const secondary = primaryToSecondary.get(r.id);
            const secData = secondary ? (dataById.get(secondary.id) ?? empty) : null;
            return {
              id: r.id,
              name: `${r.github_owner}/${r.github_repo}`,
              totalCommits: data.total,
              contributions: data.contributions,
              moon: secondary && secData ? {
                id: secondary.id,
                name: `${secondary.github_owner}/${secondary.github_repo}`,
                totalCommits: secData.total,
                contributions: secData.contributions,
              } : undefined,
            };
          });

        setPlanets(built);
      } catch (err) {
        const e = err as AxiosError;
        if (e.response?.status === 401) { navigate('/'); return; }
        setError('Não foi possível carregar o sistema orbital.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate]);

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
            Gerando sistema orbital
          </h2>
          <p className="text-gray-500 font-mono text-sm animate-pulse" style={{ minHeight: '1.25rem' }}>
            {ORBITAL_MSGS[msgIndex]}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black flex-col gap-4">
        <p className="text-red-400/80 font-mono text-sm">{error}</p>
        <button
          onClick={() => navigate('/graviton-home')}
          className="text-white/30 font-mono text-xs underline underline-offset-4 hover:text-white/60 transition-colors"
        >
          ← Voltar
        </button>
      </div>
    );
  }

  const count = planets?.length ?? 0;

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <Stars />

      {planets && (
        <div className="absolute inset-0 z-[1]">
          <OrbitalSystem planets={planets} accountName={accountName} />
        </div>
      )}

      {/* Top-left */}
      <div className="absolute top-6 left-6 pointer-events-none select-none z-10">
        <p className="text-[10px] font-black tracking-[0.3em] text-white/20 uppercase">
          Sistema Orbital
        </p>
        <h1 className="font-black text-white tracking-tighter text-xl leading-none mt-1">
          GRAVITON
        </h1>
        <p className="font-mono text-[10px] text-white/30 mt-1">
          {count} sistema{count !== 1 ? 's' : ''} orbital{count !== 1 ? 'is' : ''}
        </p>
      </div>

      {/* Back button */}
      <button
        onClick={() => navigate('/graviton-home')}
        className="absolute top-6 right-6 z-10 text-white/30 hover:text-white font-mono text-xs underline underline-offset-4 transition-colors"
      >
        ← Repositórios
      </button>

      {/* Controls hint */}
      <p className="absolute bottom-6 right-6 z-10 font-mono text-[10px] text-white/15 pointer-events-none select-none">
        Arraste para rotacionar · Scroll para zoom
      </p>

      {count === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <p className="font-mono text-sm text-white/25">
            Nenhum repositório ativo para visualizar.
          </p>
        </div>
      )}
    </div>
  );
}
