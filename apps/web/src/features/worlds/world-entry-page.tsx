import { worldGamePath } from '../../routing.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, ApiError, type Account, type World, type WorldEntry } from '@dwar/api-client';
import { LegacyFrame } from '../../components/legacy-frame.js';

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
      <LegacyFrame>
        <div className="legacy-content">
          <p>Entrando no mundo…</p>
        </div>
      </LegacyFrame>
    );
  if (entry.error)
    return (
      <LegacyFrame>
        <div className="legacy-content">
          <p className="error" role="alert">
            {entry.error.message}
          </p>
          <button onClick={() => void entry.refetch()}>Tentar novamente</button>{' '}
          <Link to="/worlds">Voltar aos mundos</Link>
        </div>
      </LegacyFrame>
    );

  // beta/create_village.php has a heading and a single explicit build action.
  return (
    <main className="village-foundation">
      <h1>Construa uma nova aldeia!</h1>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
      >
        <button className="green" disabled={create.isPending}>
          {create.isPending ? 'Processando…' : 'Construir'}
        </button>
      </form>
      {create.error ? (
        <p className="error" role="alert">
          {create.error.message}
        </p>
      ) : null}
    </main>
  );
}
