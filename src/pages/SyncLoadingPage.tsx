import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, normalizeContributions } from '../services/api';
import type { ContributionsResponse } from '../types/database';

const MESSAGES = [
  'Iniciando campo gravitacional...',
  'Mapeando contribuidores do repositório...',
  'Calculando órbitas gravitacionais...',
  'Construindo o planeta de commits...',
  'Gerando seu sistema graviton, por favor aguarde...',
];

export default function SyncLoadingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const repoId = location.state?.repoId as string | undefined;
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (!repoId) {
      navigate('/graviton-home');
      return;
    }

    let contributions: ContributionsResponse | null = null;
    let minTimeElapsed = false;
    let done = false;

    const tryNavigate = () => {
      if (contributions && minTimeElapsed && !done) {
        done = true;
        navigate(`/globe?repository_id=${repoId}`, { state: { contributions } });
      }
    };

    api.get(`/contributions?repository_id=${repoId}`)
      .then(res => {
        contributions = normalizeContributions(res.data);
        tryNavigate();
      })
      .catch(() => navigate('/graviton-home'));

    // Minimum 2.5s so the animation is visible and the user reads the messages
    const minTimer = setTimeout(() => {
      minTimeElapsed = true;
      tryNavigate();
    }, 2500);

    const msgInterval = setInterval(() => {
      setMsgIndex(i => (i + 1) % MESSAGES.length);
    }, 600);

    return () => {
      clearTimeout(minTimer);
      clearInterval(msgInterval);
    };
  }, [repoId, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-12 text-center gap-10">
      {/* Animated planet placeholder */}
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
          Gerando seu sistema graviton
        </h2>
        <p className="text-gray-500 font-mono text-sm animate-pulse" style={{ minHeight: '1.25rem' }}>
          {MESSAGES[msgIndex]}
        </p>
      </div>
    </div>
  );
}
