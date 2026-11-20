import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Brand } from './icons.js';

export type RailItem = {
  key: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  badge?: number;
  disabled?: boolean;
  onClick: () => void;
};

function RailButton({ item }: { item: RailItem }) {
  return (
    <button
      type="button"
      className="rail-item"
      aria-current={item.active ? 'page' : undefined}
      disabled={item.disabled}
      onClick={item.onClick}
    >
      <span className="rail-icon" aria-hidden="true">
        {item.icon}
        {item.badge ? (
          <span className="rail-badge">{item.badge > 99 ? '99+' : item.badge}</span>
        ) : null}
      </span>
      <span className="rail-label">{item.label}</span>
    </button>
  );
}

/**
 * Estrutura do jogo: barra superior fixa, trilho de navegação à esquerda
 * (barra inferior no celular) e área principal em largura total.
 */
export function GameShell({
  topbar,
  subbar,
  primary,
  secondary,
  children,
}: {
  topbar: ReactNode;
  subbar?: ReactNode;
  primary: RailItem[];
  secondary: RailItem[];
  children: ReactNode;
}) {
  return (
    <div className="shell">
      <header className="shell-topbar">
        <Link className="shell-logo" to="/worlds" aria-label="DWar — mundos">
          <Brand size={42} />
        </Link>
        {topbar}
      </header>
      <nav className="shell-rail" aria-label="Menu principal">
        <div className="rail-group">
          {primary.map((item) => (
            <RailButton key={item.key} item={item} />
          ))}
        </div>
        <div className="rail-group rail-group-end">
          {secondary.map((item) => (
            <RailButton key={item.key} item={item} />
          ))}
        </div>
      </nav>
      <main className="shell-main">
        {subbar ? <div className="shell-subbar">{subbar}</div> : null}
        {children}
      </main>
    </div>
  );
}
