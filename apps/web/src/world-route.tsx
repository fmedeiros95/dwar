import { lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, type Account } from '@dwar/api-client';
import { LegacyFrame } from './components/legacy-frame.js';
import { WorldEntryPage } from './features/worlds/world-entry-page.js';
const VillagePage = lazy(() =>
  import('./features/village/village-page.js').then((m) => ({ default: m.VillagePage })),
);

export function WorldRoute({
  account,
  onLogout,
  page,
}: {
  account: Account;
  onLogout: () => Promise<void>;
  page: 'game' | 'enter';
}) {
  const { worldCode = '' } = useParams();
  const world = useQuery({
    queryKey: ['world-by-slug', worldCode],
    queryFn: () => api.worldBySlug(worldCode),
    staleTime: 60_000,
  });
  if (!world.data)
    return (
      <LegacyFrame>
        <div className="legacy-content">
          <h1>{world.isPending ? 'Carregando mundo…' : 'Mundo indisponível'}</h1>
          {world.error ? (
            <p className="error" role="alert">
              {world.error.message}
            </p>
          ) : null}
          {world.error ? (
            <button onClick={() => void world.refetch()}>Tentar novamente</button>
          ) : null}{' '}
          <Link to="/worlds">Voltar aos mundos</Link>
        </div>
      </LegacyFrame>
    );
  return page === 'enter' ? (
    <WorldEntryPage account={account} world={world.data} />
  ) : (
    <Suspense fallback={null}>
      <VillagePage account={account} onLogout={onLogout} world={world.data} />
    </Suspense>
  );
}
