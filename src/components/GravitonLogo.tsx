interface Props {
  size?: number;
  className?: string;
  showRing?: boolean;
}

export default function GravitonLogo({ size = 48, className, showRing = true }: Props) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      className={className}
    >
      {showRing && (
        <>
          <circle cx="100" cy="100" r="92" stroke="#1e1e1e" strokeWidth="2" />
          <circle cx="100" cy="8" r="3.5" fill="#2d2d2d" />
        </>
      )}

      {/* Left stroke */}
      <rect x="28" y="28" width="26" height="144" fill="white" />

      {/* Top stroke — 45° angular cut at opening (Grok signature) */}
      <polygon points="28,28 148,28 174,54 28,54" fill="white" />

      {/* Bottom stroke */}
      <rect x="28" y="146" width="146" height="26" fill="white" />

      {/* G shelf — angular pointed left end */}
      <polygon points="118,93 174,93 174,119 118,119 93,106" fill="white" />

      {/* Lower-right stroke */}
      <rect x="148" y="93" width="26" height="79" fill="white" />
    </svg>
  );
}
