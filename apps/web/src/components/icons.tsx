import type { CSSProperties, ReactNode } from 'react';

/**
 * Ícones próprios do DWar: silhuetas cheias, desenhadas numa grade de 32, com detalhes gravados
 * em `--icon-line`. A cor principal vem de `currentColor`.
 */
const L = 'var(--icon-line, rgb(30 16 6 / 0.55))';

const paths: Record<string, ReactNode> = {
  wood: (
    <>
      <circle cx="10" cy="22" r="7" />
      <circle cx="22" cy="22" r="7" />
      <circle cx="16" cy="10.5" r="7" />
      <g fill="none" stroke={L} strokeWidth="1.2">
        <circle cx="10" cy="22" r="3.8" />
        <circle cx="22" cy="22" r="3.8" />
        <circle cx="16" cy="10.5" r="3.8" />
        <circle cx="10" cy="22" r="1" />
        <circle cx="22" cy="22" r="1" />
        <circle cx="16" cy="10.5" r="1" />
      </g>
    </>
  ),
  clay: (
    <>
      <rect x="4" y="4.5" width="24" height="7" rx="1.2" />
      <rect x="2" y="13.5" width="13" height="7" rx="1.2" />
      <rect x="17" y="13.5" width="13" height="7" rx="1.2" />
      <rect x="4" y="22.5" width="10" height="6" rx="1.2" />
      <rect x="16" y="22.5" width="12" height="6" rx="1.2" />
    </>
  ),
  iron: (
    <>
      <path d="M2.5 25 L8 11 H24 L29.5 25 Z" />
      <path d="M8 11 H24 L22.4 15 H9.6 Z" fill="#fff" opacity=".32" />
      <path d="M5 21 H27" stroke={L} strokeWidth="1.2" fill="none" />
    </>
  ),
  food: (
    <>
      <path d="M16 29.5 V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="16" cy="5.2" rx="2.3" ry="4" />
      <ellipse cx="11.3" cy="10.5" rx="2.5" ry="4.4" transform="rotate(-32 11.3 10.5)" />
      <ellipse cx="20.7" cy="10.5" rx="2.5" ry="4.4" transform="rotate(32 20.7 10.5)" />
      <ellipse cx="11.3" cy="17.5" rx="2.5" ry="4.4" transform="rotate(-32 11.3 17.5)" />
      <ellipse cx="20.7" cy="17.5" rx="2.5" ry="4.4" transform="rotate(32 20.7 17.5)" />
      <ellipse cx="11.3" cy="24.5" rx="2.5" ry="4.2" transform="rotate(-32 11.3 24.5)" />
      <ellipse cx="20.7" cy="24.5" rx="2.5" ry="4.2" transform="rotate(32 20.7 24.5)" />
    </>
  ),
  people: (
    <>
      <circle cx="16" cy="10" r="5.6" />
      <path d="M4.5 29 C4.5 20 10 16.5 16 16.5 C22 16.5 27.5 20 27.5 29 Z" />
    </>
  ),
  storage: (
    <>
      <path d="M6.5 6 C3.6 12 3.6 20 6.5 27 H25.5 C28.4 20 28.4 12 25.5 6 Z" />
      <ellipse cx="16" cy="6" rx="9.5" ry="2.8" />
      <g fill="none" stroke={L} strokeWidth="1.3">
        <path d="M4.4 12 H27.6" />
        <path d="M4.4 20.5 H27.6" />
        <ellipse cx="16" cy="6" rx="9.5" ry="2.8" />
      </g>
    </>
  ),
  coin: (
    <>
      <circle cx="16" cy="16" r="13" />
      <circle cx="16" cy="16" r="9.4" fill="none" stroke={L} strokeWidth="1.3" />
      <path d="M10.6 20 L11.6 12.4 L14.4 15.6 L16 11 L17.6 15.6 L20.4 12.4 L21.4 20 Z" fill={L} />
    </>
  ),
  time: (
    <path d="M7.5 3.5 H24.5 V6 C24.5 11 19.4 14 17.8 16 C19.4 18 24.5 21 24.5 26 V28.5 H7.5 V26 C7.5 21 12.6 18 14.2 16 C12.6 14 7.5 11 7.5 6 Z" />
  ),
  banner: (
    <>
      <path d="M7 3 V29" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M9 5 H27 L22.5 11 L27 17 H9 Z" />
    </>
  ),
  village: (
    <path
      fillRule="evenodd"
      d="M3 29 V6 H5.5 V8.5 H7 V6 H9.5 V8.5 H11 V14 H13.5 V12 H15 V14 H17 V12 H18.5 V14 H21 V8.5 H22.5 V6 H25 V8.5 H26.5 V6 H29 V29 Z M13.5 29 V22 a2.5 2.5 0 0 1 5 0 V29 Z"
    />
  ),
  build: (
    <>
      <path d="M13 15 L26.5 28.5" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" />
      <rect x="4" y="4.5" width="17" height="8.5" rx="1.6" transform="rotate(35 12.5 8.75)" />
    </>
  ),
  map: (
    <>
      <path d="M3 7.5 L11 4 L21 7.5 L29 4 V24.5 L21 28 L11 24.5 L3 28 Z" />
      <path d="M11 4 V24.5 M21 7.5 V28" stroke={L} strokeWidth="1.2" fill="none" />
      <path
        d="M14.4 11.5 L18 16.5 M18 11.5 L14.4 16.5"
        stroke={L}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </>
  ),
  reports: (
    <>
      <path d="M8 4.5 H26 V24.5 C26 26.8 24.2 28.5 22 28.5 H9 C11 27 11 25.4 11 24 V8 C11 6.4 9.8 5.2 8 4.5 Z" />
      <path
        d="M14.5 11 H22.5 M14.5 15 H22.5 M14.5 19 H20"
        stroke={L}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  ),
  tribe: (
    <>
      <path d="M6 3.5 H8 V29 H6 Z" />
      <path d="M8 5 C12 3.2 15.5 7 20 5.2 C22.5 4.2 24.5 4.4 26.5 5.4 V16.5 C24.5 15.5 22.5 15.3 20 16.3 C15.5 18.1 12 14.3 8 16 Z" />
      <path
        d="M12.5 8.5 L15.8 10.8 L19 8.8"
        stroke={L}
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
    </>
  ),
  medal: (
    <>
      <path d="M9 3 H14.5 L16 10 L11.5 12 Z M23 3 H17.5 L16 10 L20.5 12 Z" />
      <circle cx="16" cy="20" r="8.5" />
      <path
        d="M16 15.2 L17.5 18.4 L21 18.8 L18.4 21.1 L19.1 24.5 L16 22.8 L12.9 24.5 L13.6 21.1 L11 18.8 L14.5 18.4 Z"
        fill={L}
      />
    </>
  ),
  notes: (
    <>
      <path d="M6 5.5 H23 L27 9.5 V26.5 H6 Z" />
      <path d="M23 5.5 V9.5 H27" fill="none" stroke={L} strokeWidth="1.3" />
      <path
        d="M10.5 13.5 H22.5 M10.5 17.5 H22.5 M10.5 21.5 H18"
        stroke={L}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  ),
  mail: (
    <>
      <rect x="2.5" y="6.5" width="27" height="19" rx="2" />
      <path d="M3 8 L16 18 L29 8" fill="none" stroke={L} strokeWidth="1.4" />
      <circle cx="16" cy="18" r="4.2" fill={L} />
    </>
  ),
  activity: (
    <>
      <path d="M16 8 C12 4.8 7 4.6 2.8 6 V25.5 C7 24.2 12 24.5 16 27.8 C20 24.5 25 24.2 29.2 25.5 V6 C25 4.6 20 4.8 16 8 Z" />
      <path d="M16 8 V27.5" stroke={L} strokeWidth="1.3" />
    </>
  ),
  ranking: (
    <>
      <path d="M4 23.5 L2.8 9 L10 15 L16 5.5 L22 15 L29.2 9 L28 23.5 Z" />
      <rect x="4" y="25.2" width="24" height="3.3" rx="1" />
      <circle cx="16" cy="19" r="1.8" fill={L} />
    </>
  ),
  settings: (
    <>
      <path
        fillRule="evenodd"
        d="M16 8 a8 8 0 1 0 0 16 a8 8 0 1 0 0 -16 Z M16 12.4 a3.6 3.6 0 1 1 0 7.2 a3.6 3.6 0 1 1 0 -7.2 Z"
      />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <rect
          key={angle}
          x="13.6"
          y="2.2"
          width="4.8"
          height="7"
          rx="1.2"
          transform={`rotate(${angle} 16 16)`}
        />
      ))}
    </>
  ),
  world: (
    <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <circle cx="16" cy="16" r="12" />
      <ellipse cx="16" cy="16" rx="5.2" ry="12" />
      <path d="M4 16 H28" />
    </g>
  ),
  logout: (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 4.5 H5.5 V27.5 H13" />
      <path d="M13 16 H28 M22 10 L28 16 L22 22" />
    </g>
  ),
  sword: (
    <>
      <path d="M27 2.8 L29.2 5 L14.6 20.2 L11.8 17.4 Z" />
      <path d="M7 16.4 L15.6 25" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M9.4 22.6 L4 28" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
    </>
  ),
  return: (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 5 L5 11 L11 17" />
      <path d="M5 11 H20 a7 7 0 0 1 0 14 H11" />
    </g>
  ),
  shield: <path d="M16 2.8 L27.5 7 V16 C27.5 22 22.4 26 16 29.5 C9.6 26 4.5 22 4.5 16 V7 Z" />,
  helm: (
    <path d="M6 28 V19 C6 13 9 8 14 6 L16 3 L18.4 6.6 C22.6 8 26 12 26 17.5 V28 H21 V20 L18 22 V28 Z" />
  ),
  tower: (
    <path
      d="M7 29 V12 H9.4 V9 H12.6 V12 H14.4 V9 H17.6 V12 H19.4 V9 H22.6 V12 H25 V29 Z M14 29 V23 a2 2 0 0 1 4 0 V29 Z"
      fillRule="evenodd"
    />
  ),
};

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 24,
  className,
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={`icon${className ? ` ${className}` : ''}`}
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      style={style}
    >
      {paths[name]}
    </svg>
  );
}

/**
 * Marca do DWar (Decade of War): duas espadas cruzadas formam o X, o 10 romano, num escudo.
 */
export function Emblem({ size = 56 }: { size?: number }) {
  return (
    <svg
      className="emblem"
      viewBox="0 0 64 72"
      width={size}
      height={(size * 72) / 64}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="em-field" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a8382d" />
          <stop offset="1" stopColor="#541811" />
        </linearGradient>
        <linearGradient id="em-steel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4efe2" />
          <stop offset="1" stopColor="#a7a398" />
        </linearGradient>
        <linearGradient id="em-brass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0cf84" />
          <stop offset="1" stopColor="#a8782c" />
        </linearGradient>
      </defs>
      <path
        d="M32 2.5 C23 6.5 13 7.4 4 5.4 V34 C4 52 17 63 32 69.5 C47 63 60 52 60 34 V5.4 C51 7.4 41 6.5 32 2.5 Z"
        fill="url(#em-field)"
        stroke="url(#em-brass)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M32 8 C24 11 15.5 11.8 8.4 10.4 V34 C8.4 49 19.5 58.4 32 64.2"
        fill="none"
        stroke="#fff"
        strokeOpacity=".16"
        strokeWidth="1.2"
      />
      {/* duas espadas: o X */}
      <g transform="translate(32 33)">
        {[45, -45].map((angle) => (
          <g key={angle} transform={`rotate(${angle})`}>
            <path d="M-2.6 -26 L0 -30.5 L2.6 -26 V8 H-2.6 Z" fill="url(#em-steel)" />
            <path d="M0 -29 V8" stroke="#6f6b61" strokeWidth=".8" />
            <rect x="-9" y="8" width="18" height="3.6" rx="1.6" fill="url(#em-brass)" />
            <rect x="-1.9" y="11.6" width="3.8" height="9" rx="1.4" fill="#3b2316" />
            <circle cx="0" cy="22.6" r="2.6" fill="url(#em-brass)" />
          </g>
        ))}
      </g>
      <circle cx="32" cy="33" r="3.2" fill="url(#em-brass)" stroke="#541811" strokeWidth="1" />
    </svg>
  );
}

/** Emblema com o nome do jogo ao lado. */
export function Brand({ size = 44, subtitle = true }: { size?: number; subtitle?: boolean }) {
  return (
    <span className="brand">
      <Emblem size={size} />
      <span className="brand-text">
        <span className="brand-name">DWar</span>
        {subtitle ? <span className="brand-sub">Decade of War</span> : null}
      </span>
    </span>
  );
}
