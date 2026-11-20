import { worldGamePath } from '../../routing.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, ApiError, type Account, type World, type WorldEntry } from '@dwar/api-client';
import { Castle } from 'lucide-react';
import { PregameShell } from '../../components/pregame-shell.js';

export function WorldEntryPage({ account, world }: { account: Account; world: World }) {
  const worldId = world.id;
  const client = useQueryClient();
  const entry = useQuery({
    queryKey: ['world-entry', worldId, account.id],
    queryFn: () => api.enterWorld(worldId),
  });
  const create = useMutation({
    mutationFn: () => api.createVillage(worldId),
    onSuccess: (snapshot) => {
      client.setQueryData(['village', worldId, null], snapshot);
      client.setQueryData<WorldEntry>(['world-entry', worldId, account.id], {
        world: snapshot.world,
        villageId: snapshot.village.id,
      });
    },
  });
  const sessionError = entry.error ?? create.error;
  useEffect(() => {
    if (sessionError instanceof ApiError && sessionError.status === 401) {
      client.clear();
      client.setQueryData(['account'], null);
    }
  }, [sessionError, client]);

  if (entry.error instanceof ApiError && entry.error.status === 401)
    return <Navigate to="/" replace />;
  if (entry.data?.villageId)
    return (
      <Navigate
        to={worldGamePath(world.slug, { village: entry.data.villageId, screen: 'overview' })}
        replace
      />
    );
  if (entry.isPending)
    return (
      <PregameShell username={account.username}>
        <section className="foundation-card" aria-busy="true">
          <div className="spinner" aria-hidden="true" />
          <p>Entrando em {world.name}…</p>
        </section>
      </PregameShell>
    );
  if (entry.error)
    return (
      <PregameShell username={account.username}>
        <section className="foundation-card">
          <p className="error" role="alert">
            {entry.error.message}
          </p>
          <div className="foundation-actions">
            <button onClick={() => void entry.refetch()}>Tentar novamente</button>
            <Link to="/worlds">Voltar aos mundos</Link>
          </div>
        </section>
      </PregameShell>
    );

  return (
    <PregameShell username={account.username}>
      <section className="foundation-card" aria-labelledby="foundation-title">
        <Castle className="foundation-icon" aria-hidden="true" />
        <h1 id="foundation-title">Funde sua aldeia em {world.name}</h1>
        <p>
          Seu povo chega com recursos iniciais para erguer as primeiras construções. Escolha bem
          onde investir.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <button className="green foundation-submit" disabled={create.isPending}>
            {create.isPending ? 'Fundando…' : 'Fundar aldeia'}
          </button>
        </form>
        {create.error ? (
          <p className="error" role="alert">
            {create.error.message}
          </p>
        ) : null}
        <Link className="foundation-back" to="/worlds">
          Escolher outro mundo
        </Link>
      </section>
    </PregameShell>
  );
}
