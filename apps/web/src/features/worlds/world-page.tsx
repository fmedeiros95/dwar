import { worldEntryPath } from '../../routing.js';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Globe, Hammer, Sprout } from 'lucide-react';
import { api, type Account } from '@dwar/api-client';
import { PregameShell } from '../../components/pregame-shell.js';

export function WorldPage({
  account,
  onLogout,
}: {
  account: Account;
  onLogout: () => Promise<void>;
}) {
  const worlds = useQuery({ queryKey: ['worlds'], queryFn: api.worlds });
  const navigate = useNavigate();
  const logout = useMutation({ mutationFn: onLogout });
  return (
    <PregameShell
      username={account.username}
      onLogout={() => logout.mutate()}
      logoutPending={logout.isPending}
    >
      <section className="pregame-section" aria-labelledby="worlds-title">
        <header className="pregame-heading">
          <h1 id="worlds-title">Escolha seu mundo</h1>
          <p>Bem-vindo, {account.username}. Cada mundo tem suas próprias regras de velocidade.</p>
        </header>
        {worlds.isPending ? (
          <ul className="world-grid" aria-busy="true" aria-label="Carregando mundos">
            <li className="world-card skeleton" />
            <li className="world-card skeleton" />
          </ul>
        ) : null}
        {worlds.error ? (
          <p className="error" role="alert">
            {worlds.error.message}{' '}
            <button className="text-button" onClick={() => void worlds.refetch()}>
              Tentar novamente
            </button>
          </p>
        ) : null}
        {worlds.data?.length === 0 ? (
          <p className="pregame-empty">Nenhum mundo disponível no momento.</p>
        ) : null}
        <ul className="world-grid">
          {worlds.data?.map((world) => (
            <li className="world-card" key={world.id}>
              <Globe className="world-card-icon" aria-hidden="true" />
              <h2>{world.name}</h2>
              <ul className="world-stats">
                <li title="Velocidade de construção">
                  <Hammer size={15} aria-hidden="true" />
                  Construção <strong>{world.buildSpeed / 1000}×</strong>
                </li>
                <li title="Velocidade de produção">
                  <Sprout size={15} aria-hidden="true" />
                  Produção <strong>{world.productionSpeed / 1000}×</strong>
                </li>
              </ul>
              <button
                className="green world-card-enter"
                onClick={() => navigate(worldEntryPath(world.slug))}
              >
                Entrar no mundo
              </button>
            </li>
          ))}
        </ul>
        {logout.error ? (
          <p className="error" role="alert">
            {logout.error.message}
          </p>
        ) : null}
      </section>
    </PregameShell>
  );
}
