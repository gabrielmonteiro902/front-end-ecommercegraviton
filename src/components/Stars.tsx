import { useMemo } from 'react';

export default function Stars({ count = 140 }: { count?: number }) {
  const stars = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
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
