import { useEffect, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGameSearchParams as useSearchParams } from '../../../routing.js';
import {
  api,
  type RankingBoard,
  type RankingKillType,
  type VillageSnapshot,
} from '@dwar/api-client';
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

const boards: { code: RankingBoard; label: string }[] = [
  { code: 'player', label: 'Jogadores' },
  { code: 'continent', label: 'Continente' },
  { code: 'kills', label: 'Batalha' },
];
const killTypes: { code: RankingKillType; label: string }[] = [
  { code: 'att', label: 'Como atacante' },
  { code: 'def', label: 'Como defensor' },
  { code: 'all', label: 'Total' },
];

/** Número do continente de uma coordenada (K54: linha 5, coluna 4), como no mapa. */
const continentOf = (x: number, y: number) => Math.floor(y / 100) * 10 + Math.floor(x / 100);
const continentLabel = (continent: number) => `K${String(continent).padStart(2, '0')}`;

export function RankingScreen({ snapshot }: { snapshot: VillageSnapshot }) {
  const worldId = snapshot.world.id;
  const [params, setParams] = useSearchParams();
  const rpage = params.get('rpage'),
    rsearch = params.get('rsearch');
  const requestedBoard = params.get('board');
  const board: RankingBoard = boards.some((b) => b.code === requestedBoard)
    ? (requestedBoard as RankingBoard)
    : 'player';
  const requestedType = params.get('rtype');
  const type: RankingKillType = killTypes.some((t) => t.code === requestedType)
    ? (requestedType as RankingKillType)
    : 'att';
  const ownContinent = continentOf(snapshot.village.x, snapshot.village.y);
  const continentParam = params.get('rcont');
  const continent =
    continentParam !== null && /^\d{1,2}$/.test(continentParam)
      ? Number(continentParam)
      : ownContinent;
  const [searchInput, setSearchInput] = useState(rsearch ?? ''),
    [goInput, setGoInput] = useState(''),
    [continentInput, setContinentInput] = useState(String(continent));
  const ranking = useQuery({
    queryKey: ['ranking', worldId, board, type, continent, rpage, rsearch],
    queryFn: () =>
      api.ranking(worldId, {
        page: rpage ? Number(rpage) : undefined,
        search: rsearch ?? undefined,
        board,
        type,
        continent,
      }),
  });
  const data = ranking.data;

  /** Mantém o painel escolhido ao navegar; `extra` troca página, busca ou parâmetros do painel. */
  function nav(extra: Record<string, string | number> = {}, replace = false) {
    setParams(
      {
        village: snapshot.village.id,
        screen: 'ranking',
        ...(board === 'player' ? {} : { board }),
        ...(board === 'kills' ? { rtype: type } : {}),
        ...(board === 'continent' ? { rcont: continent } : {}),
        ...extra,
      },
      { replace },
    );
  }
  useEffect(() => {
    if (data && data.mode === 'list' && !rpage && !rsearch)
      setParams(
        {
          village: snapshot.village.id,
          screen: 'ranking',
          ...(board === 'player' ? {} : { board }),
          ...(board === 'kills' ? { rtype: type } : {}),
          ...(board === 'continent' ? { rcont: continent } : {}),
          rpage: data.page,
        },
        { replace: true },
      );
  }, [data, rpage, rsearch, setParams, snapshot.village.id, board, type, continent]);
  function goToPage(page: number) {
    nav({ rpage: page });
  }
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!searchInput.trim()) return;
    nav({ rsearch: searchInput });
  }
  function submitGoTo() {
    const rank = parseInt(goInput, 10);
    if (Number.isFinite(rank) && rank > 0) goToPage(Math.ceil(rank / 20));
  }
  function chooseBoard(next: RankingBoard) {
    setParams({
      village: snapshot.village.id,
      screen: 'ranking',
      ...(next === 'player' ? {} : { board: next }),
      ...(next === 'kills' ? { rtype: type } : {}),
      ...(next === 'continent' ? { rcont: continent } : {}),
    });
  }
  function submitContinent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = parseInt(continentInput, 10);
    if (Number.isInteger(value) && value >= 0 && value <= 99) {
      setContinentInput(String(value));
      setParams({ village: snapshot.village.id, screen: 'ranking', board, rcont: value });
    }
  }
  const pages = data && data.mode === 'list' ? pageWindow(data.page, data.pageCount) : [];
  const metric =
    board === 'kills'
      ? 'Unidades derrotadas'
      : board === 'continent'
        ? `Pontos em ${continentLabel(continent)}`
        : 'Pontos';
  const heading =
    board === 'kills'
      ? 'Pontos de batalha'
      : board === 'continent'
        ? `Ranking do continente ${continentLabel(continent)}`
        : 'Ranking de jogadores';
  return (
    <div className="legacy-content page-card">
      <header className="page-head">
        <h1>
          <Trophy size={22} aria-hidden="true" /> {heading}
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
      <nav className="report-tabs" aria-label="Tipo de ranking">
        {boards.map((tab) => (
          <button
            key={tab.code}
            className={tab.code === board ? 'active' : undefined}
            aria-current={tab.code === board ? 'page' : undefined}
            onClick={() => chooseBoard(tab.code)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {board === 'kills' ? (
        <nav className="rank-subtabs" aria-label="Pontos de batalha">
          {killTypes.map((tab) => (
            <button
              key={tab.code}
              className={tab.code === type ? 'active' : undefined}
              aria-current={tab.code === type ? 'page' : undefined}
              onClick={() =>
                setParams({
                  village: snapshot.village.id,
                  screen: 'ranking',
                  board: 'kills',
                  rtype: tab.code,
                })
              }
            >
              {tab.label}
            </button>
          ))}
        </nav>
      ) : null}
      {board === 'continent' ? (
        <form className="rank-continent" onSubmit={submitContinent}>
          <label>
            Continente
            <input
              value={continentInput}
              inputMode="numeric"
              maxLength={2}
              size={3}
              aria-label="Número do continente"
              onChange={(event) => setContinentInput(event.currentTarget.value)}
            />
          </label>
          <button className="button">Ver</button>
          <button
            type="button"
            className="button"
            disabled={continent === ownContinent}
            onClick={() => {
              setContinentInput(String(ownContinent));
              setParams({
                village: snapshot.village.id,
                screen: 'ranking',
                board: 'continent',
                rcont: ownContinent,
              });
            }}
          >
            Meu continente ({continentLabel(ownContinent)})
          </button>
        </form>
      ) : null}
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
              <th>{metric}</th>
              <th>{board === 'continent' ? 'Aldeias no continente' : 'Aldeias'}</th>
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
                  {board === 'continent' && data.mode === 'list'
                    ? `Nenhum jogador no continente ${continentLabel(continent)}.`
                    : 'Nenhum jogador encontrado.'}
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
        <button className="text-button" onClick={() => nav()}>
          « Voltar à lista completa
        </button>
      ) : null}
    </div>
  );
}
