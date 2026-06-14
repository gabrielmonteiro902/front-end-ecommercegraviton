import { useEffect, useState } from 'react';

interface OrbitalLoadingProps {
  title: string;
  messages: string[];
}

export default function OrbitalLoading({ title, messages }: OrbitalLoadingProps) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setMsgIndex(i => (i + 1) % messages.length), 700);
    return () => clearInterval(id);
  }, [messages.length]);

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
          {title}
        </h2>
        <p className="text-gray-500 font-mono text-sm animate-pulse" style={{ minHeight: '1.25rem' }}>
          {messages[msgIndex]}
        </p>
      </div>
    </div>
  );
}
