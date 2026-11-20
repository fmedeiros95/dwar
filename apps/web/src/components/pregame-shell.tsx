import type { ReactNode } from 'react';
import { Brand } from './icons.js';
import { Link } from 'react-router-dom';
import { LogOut, UserRound } from 'lucide-react';

/** Layout das telas anteriores ao jogo: mundos, fundação da aldeia e estados de carregamento. */
export function PregameShell({
  children,
  username,
  onLogout,
  logoutPending,
}: {
  children: ReactNode;
  username?: string;
  onLogout?: () => void;
  logoutPending?: boolean;
}) {
  return (
    <div className="pregame">
      <div className="landing-bg" aria-hidden="true" />
      <header className="pregame-bar">
        <Link to="/worlds" aria-label="DWar — mundos">
          <Brand size={40} />
        </Link>
        {username ? (
          <div className="pregame-user">
            <span>
              <UserRound size={15} aria-hidden="true" />
              {username}
            </span>
            {onLogout ? (
              <button type="button" onClick={onLogout} disabled={logoutPending}>
                <LogOut size={14} aria-hidden="true" />
                Sair
              </button>
            ) : null}
          </div>
        ) : null}
      </header>
      <main className="pregame-main">{children}</main>
    </div>
  );
}
