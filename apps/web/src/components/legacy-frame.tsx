import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Brand, Icon, type IconName } from './icons.js';

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
          <Brand size={52} />
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
const resourceIcon: Record<string, IconName> = {
  wood: 'wood',
  stone: 'clay',
  iron: 'iron',
  peasants: 'people',
  food: 'food',
  merchant: 'coin',
  noble: 'banner',
  time: 'time',
  storage: 'storage',
};

export function ResourceIcon({ code, label }: { code: string; label: string }) {
  const icon = resourceIcon[code];
  if (!icon)
    return (
      <img
        className="resource-icon"
        src={`/legacy/icons/${code}.png`}
        alt={label}
        title={label}
        width="18"
        height="18"
      />
    );
  return (
    <span className={`resource-icon ri-${code}`} role="img" aria-label={label} title={label}>
      <Icon name={icon} size={20} />
    </span>
  );
}
