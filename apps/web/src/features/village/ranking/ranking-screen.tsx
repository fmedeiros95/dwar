import { useEffect, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGameSearchParams as useSearchParams } from '../../../routing.js';
import { api, type VillageSnapshot } from '@dwar/api-client';
import { ChevronLeft, ChevronRight, Search, Trophy } from 'lucide-react';
import { numbers } from '../shared/index.js';

/** Páginas a mostrar: primeira, última e vizinhas da atual, com lacunas (null). */
export function pageWindow(current: number, count: number): (number | null)[] {
  const keep = new Set([1, count, current - 1, current, current + 1]);
  const sorted = [...keep].filter((page) => page >= 1 && page <= count).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((page, index) => {
    if (index && page - sorted[index - 1]! > 1) out.push(null);
    out.push(page);
  });
  return out;
}

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
  const pages = data && data.mode === 'list' ? pageWindow(data.page, data.pageCount) : [];
  return (
    <div className="legacy-content page-card">
      <header className="page-head">
        <h1>
          <Trophy size={22} aria-hidden="true" /> Ranking de jogadores
        </h1>
        <form className="search-field" onSubmit={submitSearch} role="search">
          <Search size={15} aria-hidden="true" />
          <input
            value={searchInput}
            placeholder="Buscar jogador"
            aria-label="Buscar jogador"
            onChange={(event) => setSearchInput(event.currentTarget.value)}
          />
          <button className="button">Buscar</button>
        </form>
      </header>
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
              <th>Jogador</th>
              <th>Pontos</th>
              <th>Aldeias</th>
              <th>Ingressou</th>
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
                    {entry.own ? <em className="rank-you">você</em> : null}
                  </span>
                </td>
                <td className="num">{numbers.format(entry.points)}</td>
                <td className="num">{numbers.format(entry.villageCount)}</td>
                <td>{new Date(entry.joinedAt).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}
            {data && !data.entries.length ? (
              <tr>
                <td colSpan={5} className="empty-cell">
                  Nenhum jogador encontrado.
                </td>
              </tr>
            ) : null}
            {!data ? (
              <tr>
                <td colSpan={5} className="empty-cell">
                  {ranking.isPending ? 'Carregando…' : 'Nenhum jogador encontrado.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {data && data.mode === 'list' ? (
        <nav className="pager" aria-label="Páginas do ranking">
          <button
            className="button"
            disabled={data.page <= 1}
            onClick={() => goToPage(data.page - 1)}
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
                onClick={() => goToPage(page)}
              >
                {page}
              </button>
            ),
          )}
          <button
            className="button"
            disabled={data.page >= data.pageCount}
            onClick={() => goToPage(data.page + 1)}
            aria-label="Próxima página"
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
          <span className="pager-goto">
            Ir para a posição
            <input
              value={goInput}
              inputMode="numeric"
              aria-label="Posição no ranking"
              onChange={(event) => setGoInput(event.currentTarget.value)}
              size={5}
              maxLength={6}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitGoTo();
              }}
            />
            <button type="button" className="button" onClick={submitGoTo}>
              Ir
            </button>
          </span>
        </nav>
      ) : null}
      {data && data.mode === 'search' ? (
        <button
          className="text-button"
          onClick={() => setParams({ village: snapshot.village.id, screen: 'ranking' })}
        >
          « Voltar à lista completa
        </button>
      ) : null}
    </div>
  );
}
