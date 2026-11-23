import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PregameShell } from './pregame-shell.js';

/** Página inteira de espera ou falha antes de o jogo abrir (conta, mundo ou aldeia). */
export function StatusPage({
  title,
  error,
  onRetry,
  retrying,
  home = true,
  children,
}: {
  title: string;
  error?: string | undefined;
  onRetry?: () => void;
  retrying?: boolean;
  home?: boolean;
  children?: ReactNode;
}) {
  return (
    <PregameShell plain={/\/game$/.test(location.pathname)}>
      <section className="foundation-card" aria-busy={error ? undefined : true}>
        {error ? null : <div className="spinner" aria-hidden="true" />}
        <h1>{title}</h1>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        {children}
        <div className="foundation-actions">
          {error && onRetry ? (
            <button type="button" disabled={retrying} onClick={onRetry}>
              {retrying ? 'Tentando…' : 'Tentar novamente'}
            </button>
          ) : null}
          {home ? <Link to="/worlds">Voltar aos mundos</Link> : null}
        </div>
      </section>
    </PregameShell>
  );
}
