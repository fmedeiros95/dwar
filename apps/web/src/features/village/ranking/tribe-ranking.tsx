import { useState, type FormEvent, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search, Trophy } from 'lucide-react';
import { api, type TribeRankingMetric, type VillageSnapshot } from '@dwar/api-client';
import { useGameSearchParams as useSearchParams } from '../../../routing.js';
import { numbers } from '../shared/index.js';
import { pageWindow } from './page-window.js';

const metrics: { code: TribeRankingMetric; label: string }[] = [
  { code: 'points', label: 'Pontos' },
  { code: 'att', label: 'Batalha: atacando' },
  { code: 'def', label: 'Batalha: defendendo' },
  { code: 'all', label: 'Batalha: total' },
];

/** Ranking de tribos (pontos ou pontos de batalha), com as abas do ranking vindas de fora. */
export function TribeRanking({ snapshot, tabs }: { snapshot: VillageSnapshot; tabs: ReactNode }) {
  const worldId = snapshot.world.id;
  const [params, setParams] = useSearchParams();
  const requested = params.get('tmetric');
  const metric: TribeRankingMetric = metrics.some((m) => m.code === requested)
    ? (requested as TribeRankingMetric)
    : 'points';
  const rpage = params.get('rpage'),
    rsearch = params.get('rsearch');
  const [searchInput, setSearchInput] = useState(rsearch ?? '');
  const ranking = useQuery({
    queryKey: ['tribe-ranking', worldId, metric, rpage, rsearch],
    queryFn: () =>
      api.tribeRanking(worldId, {
        metric,
        page: rpage ? Number(rpage) : undefined,
        search: rsearch ?? undefined,
      }),
  });
  const data = ranking.data;
  function nav(extra: Record<string, string | number> = {}) {
    setParams({
      village: snapshot.village.id,
      screen: 'ranking',
      board: 'tribes',
      tmetric: metric,
      ...extra,
    });
  }
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (searchInput.trim()) nav({ rsearch: searchInput });
  }
  const open = (id: number) =>
    setParams({ village: snapshot.village.id, screen: 'info_tribe', id });
  const label = metric === 'points' ? 'Pontos' : 'Unidades derrotadas';
  const pages = data && data.mode === 'list' ? pageWindow(data.page, data.pageCount) : [];
  return (
    <div className="legacy-content page-card">
      <header className="page-head">
        <h1>
          <Trophy size={22} aria-hidden="true" /> Ranking de tribos
        </h1>
        <form className="search-field" onSubmit={submitSearch} role="search">
          <Search size={15} aria-hidden="true" />
          <input
            value={searchInput}
            placeholder="Buscar tribo"
            aria-label="Buscar tribo"
            onChange={(event) => setSearchInput(event.currentTarget.value)}
          />
          <button className="button">Buscar</button>
        </form>
      </header>
      {tabs}
      <nav className="rank-subtabs" aria-label="Medida do ranking de tribos">
        {metrics.map((item) => (
          <button
            key={item.code}
            className={item.code === metric ? 'active' : undefined}
            aria-current={item.code === metric ? 'page' : undefined}
            onClick={() =>
              setParams({
                village: snapshot.village.id,
                screen: 'ranking',
                board: 'tribes',
                tmetric: item.code,
              })
            }
          >
            {item.label}
          </button>
        ))}
      </nav>
      {ranking.error ? (
        <p className="error" role="alert">
          {ranking.error.message}
        </p>
      ) : null}
      <div className="table-scroll">
        <table className="legacy-table rank-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Tribo</th>
              <th>{label}</th>
              <th>Membros</th>
              <th>Aldeias</th>
            </tr>
          </thead>
          <tbody>
            {data?.entries.map((entry) => (
              <tr key={entry.id} className={entry.own ? 'selected-row' : undefined}>
                <td>
                  <span className={`rank-pos${entry.rank <= 3 ? ` top-${entry.rank}` : ''}`}>
                    {numbers.format(entry.rank)}
                  </span>
                </td>
                <td>
                  <span className="rank-player">
                    <button className="text-button" onClick={() => open(entry.id)}>
                      {entry.name}
                    </button>
                    <span className="tribe-tag static">{entry.tag}</span>
                    {entry.own ? <em className="rank-you">sua tribo</em> : null}
                  </span>
                </td>
                <td className="num">{numbers.format(entry.value)}</td>
                <td className="num">{numbers.format(entry.members)}</td>
                <td className="num">{numbers.format(entry.villages)}</td>
              </tr>
            ))}
            {data && !data.entries.length ? (
              <tr>
                <td colSpan={5} className="empty-cell">
                  {data.mode === 'search'
                    ? 'Nenhuma tribo encontrada.'
                    : 'Nenhuma tribo neste mundo ainda.'}
                </td>
              </tr>
            ) : null}
            {!data ? (
              <tr>
                <td colSpan={5} className="empty-cell">
                  {ranking.isPending ? 'Carregando…' : 'Nenhuma tribo encontrada.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {data && data.mode === 'list' && data.pageCount > 1 ? (
        <nav className="pager" aria-label="Páginas do ranking de tribos">
          <button
            className="button"
            disabled={data.page <= 1}
            onClick={() => nav({ rpage: data.page - 1 })}
            aria-label="Página anterior"
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          {pages.map((page, index) =>
            page === null ? (
              <span key={`gap-${index}`} className="pager-gap">
                …
              </span>
            ) : (
              <button
                key={page}
                className={page === data.page ? 'button active' : 'button'}
                aria-current={page === data.page ? 'page' : undefined}
                onClick={() => nav({ rpage: page })}
              >
                {page}
              </button>
            ),
          )}
          <button
            className="button"
            disabled={data.page >= data.pageCount}
            onClick={() => nav({ rpage: data.page + 1 })}
            aria-label="Próxima página"
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </nav>
      ) : null}
      {data && data.mode === 'search' ? (
        <button className="text-button" onClick={() => nav()}>
          « Voltar à lista completa
        </button>
      ) : null}
    </div>
  );
}
