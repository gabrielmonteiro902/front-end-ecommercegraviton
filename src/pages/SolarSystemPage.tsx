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

export default function SolarSystemPage() {
  const navigate = useNavigate();
  const [planets, setPlanets] = useState<PlanetData[] | null>(null);
  const [accountName, setAccountName] = useState('GRAVITON');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <span className="w-6 h-6 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
          <p className="text-white/20 font-mono text-[10px] tracking-[0.25em] uppercase">
            Carregando sistema orbital...
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
