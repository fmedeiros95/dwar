import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function LegacyFrame({
  children,
  navigation,
  masthead,
  footer,
  variant,
}: {
  children: ReactNode;
  navigation?: ReactNode;
  masthead?: ReactNode;
  footer?: ReactNode;
  variant?: 'portal';
}) {
  return (
    <div className={`legacy-site${variant === 'portal' ? ' legacy-portal' : ''}`}>
      <nav className="legacy-topnav" aria-label="Menu principal">
        {navigation ?? (
          <>
            <Link to="/">Início</Link>
            <a href="#registro">Cadastro</a>
            <a href="#sobre">Sobre o jogo</a>
          </>
        )}
      </nav>
      <header className={`legacy-masthead${masthead ? ' with-login' : ''}`}>
        <span className="legacy-chain left" aria-hidden="true" />
        <Link className="legacy-logo" to="/" aria-label="DWar — início">
          <img src="/legacy/layout/logo.png" alt="Logo do jogo" width="160" height="99" />
        </Link>
        {masthead}
        <span className="legacy-chain right" aria-hidden="true" />
      </header>
      <main className="legacy-frame">
        {children}
        <footer className="legacy-footer">{footer ?? 'DWAR — Decade of War'}</footer>
      </main>
    </div>
  );
}
const resourceArt: Record<string, string> = {
  wood: 'woodB',
  stone: 'clayB',
  iron: 'ironB',
  peasants: 'workersB',
  food: 'foodB',
  merchant: 'merchantB',
  noble: 'nobleB',
  time: 'timeB',
};

export function ResourceIcon({ code, label }: { code: string; label: string }) {
  const art = resourceArt[code];
  return (
    <img
      className="resource-icon"
      src={art ? `/game/resources/${art}.webp` : `/legacy/icons/${code}.png`}
      alt={label}
      title={label}
      width="18"
      height="18"
    />
  );
}
