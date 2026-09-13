interface PpnPnLogoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  theme?: 'light' | 'dark' | 'white-badge';
  showTagline?: boolean;
}

/**
 * Logo Resmi PPNPN:
 * Dibuat persis sesuai desain tipografi BUMN PPNPN (Navy Blue #0A2B64 & Cyan #009BB9)
 * Terdiri dari:
 * 1. P (Navy, dengan notch bukaan aerodinamis di kiri)
 * 2. P (Navy, standar geometris BUMN)
 * 3. n (Vibrant Cyan, lengkungan kubah terbalik)
 * 4. P (Navy, standar geometris BUMN)
 * 5. n (Navy, lengkungan kubah terbalik)
 */
export function PpnPnLogo({
  className = '',
  width = 200,
  height,
  theme = 'light',
  showTagline = false,
}: PpnPnLogoProps) {
  // Warna logo berdasarkan tema
  const isDark = theme === 'dark';
  const isBadge = theme === 'white-badge';

  const navyColor = isDark ? '#FFFFFF' : '#0A2B64';
  const cyanColor = isDark ? '#00D4F0' : '#009BB9';

  const logoSvg = (
    <svg
      viewBox="0 0 545 100"
      width={width}
      height={height}
      className={`shrink-0 transition-colors ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Logo PPNPN"
    >
      {/* 1. Open P (Navy / White) */}
      <path
        d="M 10 0 L 64 0 A 35 35 0 0 1 99 35 A 35 35 0 0 1 64 70 L 36 70 L 36 100 L 10 100 L 10 46 L 64 46 A 11 11 0 0 0 75 35 A 11 11 0 0 0 64 24 L 10 24 Z"
        fill={navyColor}
      />

      {/* 2. Closed P (Navy / White) */}
      <path
        d="M 121 0 L 175 0 A 35 35 0 0 1 210 35 A 35 35 0 0 1 175 70 L 147 70 L 147 100 L 121 100 L 121 0 Z M 147 24 L 175 24 A 11 11 0 0 1 186 35 A 11 11 0 0 1 175 46 L 147 46 Z"
        fill={navyColor}
        fillRule="evenodd"
      />

      {/* 3. Inverted Arch n (Cyan) */}
      <path
        d="M 232 42 A 42 42 0 0 1 316 42 L 316 100 L 290 100 L 290 42 A 16 16 0 0 0 258 42 L 258 100 L 232 100 Z"
        fill={cyanColor}
      />

      {/* 4. Closed P (Navy / White) */}
      <path
        d="M 338 0 L 392 0 A 35 35 0 0 1 427 35 A 35 35 0 0 1 392 70 L 364 70 L 364 100 L 338 100 L 338 0 Z M 364 24 L 392 24 A 11 11 0 0 1 403 35 A 11 11 0 0 1 392 46 L 364 46 Z"
        fill={navyColor}
        fillRule="evenodd"
      />

      {/* 5. Navy Inverted Arch n (Navy / White) */}
      <path
        d="M 449 42 A 42 42 0 0 1 533 42 L 533 100 L 507 100 L 507 42 A 16 16 0 0 0 475 42 L 475 100 L 449 100 Z"
        fill={navyColor}
      />
    </svg>
  );

  if (isBadge) {
    return (
      <div className="inline-flex items-center justify-center bg-white px-5 py-3 rounded-2xl shadow-md border border-gray-100">
        {logoSvg}
      </div>
    );
  }

  if (showTagline) {
    return (
      <div className="inline-flex flex-col items-center">
        {logoSvg}
        <div
          className={`text-[9px] font-extrabold tracking-[0.3em] uppercase mt-2 ${
            isDark ? 'text-sky-300' : 'text-sky-700'
          }`}
        >
          UNTUK INDONESIA
        </div>
      </div>
    );
  }

  return logoSvg;
}
