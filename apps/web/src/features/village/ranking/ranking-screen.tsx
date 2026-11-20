import { useEffect, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGameSearchParams as useSearchParams } from '../../../routing.js';
import { api, type VillageSnapshot } from '@dwar/api-client';
import { numbers } from '../shared/index.js';

export function RankingScreen({ snapshot }: { snapshot: VillageSnapshot }) {
  const worldId = snapshot.world.id;
  const [params, setParams] = useSearchParams();
  const rpage = params.get('rpage'),
    rsearch = params.get('rsearch');
  const [searchInput, setSearchInput] = useState(rsearch ?? ''),
    [goInput, setGoInput] = useState('');
  const ranking = useQuery({
    queryKey: ['ranking', worldId, rpage, rsearch],
    queryFn: () =>
      api.ranking(worldId, {
        page: rpage ? Number(rpage) : undefined,
        search: rsearch ?? undefined,
      }),
  });
  const data = ranking.data;
  useEffect(() => {
    if (data && data.mode === 'list' && !rpage && !rsearch)
      setParams(
        { village: snapshot.village.id, screen: 'ranking', rpage: data.page },
        { replace: true },
      );
  }, [data, rpage, rsearch, setParams, snapshot.village.id]);
  function goToPage(page: number) {
    setParams({ village: snapshot.village.id, screen: 'ranking', rpage: page });
  }
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!searchInput.trim()) return;
    setParams({ village: snapshot.village.id, screen: 'ranking', rsearch: searchInput });
  }
  function submitGoTo() {
    const rank = parseInt(goInput, 10);
    if (Number.isFinite(rank) && rank > 0) goToPage(Math.ceil(rank / 20));
  }
  return (
    <div className="legacy-content">
      <h1>Ranking de jogadores</h1>
      {ranking.error ? (
        <p className="error" role="alert">
          {ranking.error.message}
        </p>
      ) : null}
      <div className="table-scroll">
        <table className="legacy-table">
          <thead>
            <tr>
              <th>Classificação</th>
              <th></th>
              <th>Jogador</th>
              <th>Tribo</th>
              <th>Pontos</th>
              <th>Aldeias</th>
              <th>Ingressou</th>
            </tr>
          </thead>
          <tbody>
            {data?.entries.map((entry) => (
              <tr key={entry.id} className={entry.own ? 'selected-row' : undefined}>
                <td>{numbers.format(entry.rank)}</td>
                <td>
                  <img
                    src={`/legacy/rank/rank_${entry.rankTier}.gif`}
                    alt={entry.rankTitle}
                    title={entry.rankTitle}
                  />
                </td>
                <td>
                  <button
                    className="text-button"
                    onClick={() =>
                      setParams({
                        village: snapshot.village.id,
                        screen: 'info_player',
                        id: entry.id,
                      })
                    }
                  >
                    {entry.username}
                  </button>
                </td>
                <td>Sem tribo</td>
                <td>{numbers.format(entry.points)}</td>
                <td>{numbers.format(entry.villageCount)}</td>
                <td>{new Date(entry.joinedAt).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}
            {!data ? (
              <tr>
                <td colSpan={7}>
                  {ranking.isPending ? 'Carregando…' : 'Nenhum jogador encontrado.'}
                </td>
              </tr>
            ) : null}
            <tr>
              <th colSpan={3}>
                Ir para a classificação:{' '}
                <input
                  value={goInput}
                  onChange={(event) => setGoInput(event.currentTarget.value)}
                  size={5}
                  maxLength={6}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') submitGoTo();
                  }}
                />{' '}
                <button type="button" className="button" onClick={submitGoTo}>
                  OK
                </button>
              </th>
              <th colSpan={4} style={{ textAlign: 'right' }}>
                <form onSubmit={submitSearch}>
                  Buscar jogador:{' '}
                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.currentTarget.value)}
                  />{' '}
                  <button className="button">OK</button>
                </form>
              </th>
            </tr>
          </tbody>
        </table>
      </div>
      {data && data.mode === 'list' ? (
        <p>
          {Array.from({ length: data.pageCount }, (_, index) => index + 1).map((page) => (
            <span key={page}>
              {' '}
              {page === data.page ? (
                <strong>[{page}]</strong>
              ) : (
                <button className="text-button" onClick={() => goToPage(page)}>
                  {page}
                </button>
              )}
            </span>
          ))}
        </p>
      ) : null}
      {data && data.mode === 'search' ? (
        <button
          className="text-button"
          onClick={() => setParams({ village: snapshot.village.id, screen: 'ranking' })}
        >
          » Voltar à lista completa
        </button>
      ) : null}
    </div>
  );
}
