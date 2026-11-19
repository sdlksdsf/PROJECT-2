interface BrandMarkProps {
  size?: number;
  radius?: number;
  className?: string;
  /** Monochrome variant for use on coloured backgrounds. */
  mono?: boolean;
}

/**
 * The Kimmino mark: a soft squircle holding a geometric "K" whose lower arm
 * turns into a shield — speed and privacy in one shape.
 */
export function BrandMark({ size = 22, radius = 7, className, mono = false }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="Kimmino"
      style={{ borderRadius: radius, display: 'block' }}
    >
      <defs>
        <linearGradient id="kimmino-mark-gradient" x1="4" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7c97ff" />
          <stop offset="0.52" stopColor="#5b8dfb" />
          <stop offset="1" stopColor="#33d6a6" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill={mono ? 'currentColor' : 'url(#kimmino-mark-gradient)'} />
      <path
        d="M17.4 12.6v22.8"
        stroke="#0a1220"
        strokeWidth="4.1"
        strokeLinecap="round"
        opacity={mono ? 0.9 : 1}
      />
      <path
        d="M33.8 11.6 25.6 23.6l8.2 12.8"
        stroke="#0a1220"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={mono ? 0.9 : 1}
      />
    </svg>
  );
}

export function BrandWordmark({
  size = 27,
  className,
  showText = true
}: {
  size?: number;
  className?: string;
  showText?: boolean;
}) {
  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
      <BrandMark size={size} radius={size * 0.3} />
      {showText && (
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: Math.round(size * 0.62),
            letterSpacing: '-0.02em',
            lineHeight: 1,
            whiteSpace: 'nowrap'
          }}
        >
          Kimmino
        </span>
      )}
    </div>
  );
}
