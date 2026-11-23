import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { api, type PublicVillage, type MapSnapshot, type RelationKind } from '@dwar/api-client';
import { duration, numbers } from '../shared/index.js';
import { unitIconSrc } from '../../../components/unit-icon.js';
import { Icon } from '../../../components/icons.js';

export function villageGraphic(points: number): number {
  return points < 300
    ? 1
    : points < 1000
      ? 2
      : points < 3000
        ? 3
        : points < 9000
          ? 4
          : points < 12000
            ? 5
            : 6;
}

/**
 * Dono de cada aldeia no mapa. As famílias de cor seguem a convenção do gênero (você em ouro,
 * tribo em azul, inimigos em vermelho), afinadas à paleta do jogo. Cada tipo também tem um sinal
 * próprio no brasão, para não depender só da cor.
 */
export type OwnerKind =
  'current' | 'own' | 'tribe' | 'ally' | 'nap' | 'enemy' | 'marked' | 'player' | 'barbarian';
export const ownerPalette: Record<Exclude<OwnerKind, 'marked'>, string> = {
  current: '#fff1c7',
  own: '#e8be6a',
  tribe: '#4f86d9',
  ally: '#5fc2e8',
  nap: '#a070c8',
  enemy: '#d8402f',
  player: '#9a6236',
  barbarian: '#8e9196',
};

/** Cores das relações entre tribos no mapa, iguais às da legenda. */
export const relationColors: Record<RelationKind, string> = {
  ally: ownerPalette.ally,
  nap: ownerPalette.nap,
  enemy: ownerPalette.enemy,
};

export function ownerKind(
  village: PublicVillage,
  currentId: number,
  marks: MapSnapshot['marks'],
  ownTribeId: number | null = null,
  relations: Record<number, RelationKind> = {},
): OwnerKind {
  if (village.id === currentId) return 'current';
  if (village.own) return 'own';
  if (marks.some((mark) => mark.playerId === village.playerId)) return 'marked';
  if (ownTribeId !== null && village.tribe?.id === ownTribeId) return 'tribe';
  if (village.tribe && relations[village.tribe.id]) return relations[village.tribe.id]!;
  return village.playerId ? 'player' : 'barbarian';
}

export function ownerColor(
  village: PublicVillage,
  currentId: number,
  marks: MapSnapshot['marks'],
  ownTribeId: number | null = null,
  relations: Record<number, RelationKind> = {},
) {
  const kind = ownerKind(village, currentId, marks, ownTribeId, relations);
  return kind === 'marked'
    ? (marks.find((mark) => mark.playerId === village.playerId)?.color ?? ownerPalette.player)
    : ownerPalette[kind];
}

/** Brasão do dono sobre a aldeia: mesma silhueta dos selos da aldeia, cor e sinal por tipo. */
export function MapCrest({ kind, color }: { kind: OwnerKind; color: string }) {
  if (kind === 'barbarian') return null;
  return (
    <span className="map-crest" data-kind={kind} style={{ color }} aria-hidden="true">
      <svg viewBox="0 0 30 34" width="15" height="17">
        <path
          className="map-crest-shape"
          d="M1.5 3.5 Q15 -0.5 28.5 3.5 L28.5 16 Q28.5 27.5 15 33.5 Q1.5 27.5 1.5 16 Z"
        />
        {kind === 'current' ? (
          <path
            className="map-crest-sign"
            d="M15 7 L17.6 13.4 L24.4 13.8 L19.2 18.2 L20.9 24.8 L15 21.1 L9.1 24.8 L10.8 18.2 L5.6 13.8 L12.4 13.4 Z"
          />
        ) : kind === 'enemy' ? (
          <path className="map-crest-sign stroke" d="M8 9 L22 24 M22 9 L8 24" />
        ) : kind === 'tribe' || kind === 'ally' ? (
          <path className="map-crest-sign" d="M3 4.5 Q15 1.5 27 4.5 L27 11 L3 11 Z" />
        ) : kind === 'nap' ? (
          <path className="map-crest-sign stroke" d="M7 16 L23 16" />
        ) : null}
      </svg>
    </span>
  );
}

const villageLegend: [OwnerKind, string][] = [
  ['current', 'Aldeia atual'],
  ['own', 'Suas aldeias'],
  ['tribe', 'Sua tribo'],
  ['player', 'Outros jogadores'],
  ['barbarian', 'Abandonadas (sem brasão)'],
];
const tribeLegend: [OwnerKind, string][] = [
  ['ally', 'Aliados'],
  ['nap', 'Pacto de não agressão'],
  ['enemy', 'Inimigos'],
];

export function MapLegend() {
  return (
    <dl className="map-key">
      <div>
        <dt>Ordens</dt>
        <dd>
          <span>
            <span className="map-command attack">
              <Icon name="sword" size={12} />
            </span>
            Seu ataque
          </span>
          <span>
            <span className="map-command support">
              <Icon name="shield" size={12} />
            </span>
            Seu apoio
          </span>
          <span>
            <span className="map-command return">
              <Icon name="return" size={12} />
            </span>
            Tropas voltando
          </span>
          <span>
            <span className="map-command attack incoming">
              <Icon name="sword" size={12} />
            </span>
            Ataque inimigo
          </span>
        </dd>
      </div>
      {[
        { label: 'Aldeias', items: villageLegend },
        { label: 'Tribos', items: tribeLegend },
      ].map(({ label, items }) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>
            {items.map(([kind, name]) => (
              <span key={kind}>
                {kind === 'barbarian' ? (
                  <span className="map-legend-none" aria-hidden="true" />
                ) : (
                  <MapCrest kind={kind} color={ownerPalette[kind as keyof typeof ownerPalette]} />
                )}
                {name}
              </span>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const shortDate = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

/**
 * Popup que acompanha o mouse sobre uma aldeia. Mostra de imediato o que o mapa já sabe e
 * completa com os detalhes do servidor (distância, moral, proteção, tropas e tempos de viagem).
 */
export function VillagePopup({
  village,
  x,
  y,
  worldId,
  currentVillageId,
  showUnits,
  showTimes,
}: {
  village: PublicVillage;
  x: number;
  y: number;
  worldId: number;
  currentVillageId: number;
  showUnits: boolean;
  showTimes: boolean;
}) {
  const info = useQuery({
    queryKey: ['village-popup', worldId, currentVillageId, village.id],
    queryFn: () => api.villagePopup(worldId, currentVillageId, village.id),
    staleTime: 10000,
  });
  const detail = info.data;
  const abandoned = village.playerId === null;
  const troops = detail?.units.filter((unit) => (unit.home ?? 0) + (unit.foreign ?? 0) > 0) ?? [];
  const travel = detail && !detail.current ? detail.units : [];
  const blocked = detail?.protectedUntil
    ? `Proteção de iniciante até ${shortDate.format(new Date(detail.protectedUntil))}`
    : detail?.pointRatioBlocked
      ? 'Fora da proporção de pontos para atacar'
      : null;
  return createPortal(
    <div
      className="village-popup"
      style={{
        left: Math.max(3, Math.min(x + 15, window.innerWidth - 520)),
        // Sem espaço embaixo, o popup abre para cima e fica colado ao cursor.
        ...(y + 270 < window.innerHeight
          ? { top: y + 15 }
          : { bottom: window.innerHeight - y + 15, maxHeight: Math.max(120, y - 20) }),
      }}
      role="tooltip"
    >
      <header>
        <strong>{village.name}</strong>
        <span>
          ({village.x}|{village.y}) K{Math.floor(village.y / 100)}
          {Math.floor(village.x / 100)}
        </span>
      </header>
      <dl>
        <dt>Pontos</dt>
        <dd>{numbers.format(village.points)}</dd>
        <dt>Jogador</dt>
        <dd>
          {abandoned ? (
            <em>Abandonada</em>
          ) : (
            <>
              {village.username}
              <small> {numbers.format(village.playerPoints)} pontos</small>
            </>
          )}
        </dd>
        {detail ? (
          <>
            {detail.current ? null : (
              <>
                <dt>Distância</dt>
                <dd>{detail.distance.toLocaleString('pt-BR')} campos</dd>
              </>
            )}
            {detail.morale !== null ? (
              <>
                <dt>Moral</dt>
                <dd>{detail.morale}%</dd>
              </>
            ) : null}
          </>
        ) : null}
      </dl>
      {detail?.current ? <p className="pop-tag">Aldeia atual</p> : null}
      {detail?.own && !detail.current ? <p className="pop-tag">Sua aldeia</p> : null}
      {blocked ? <p className="pop-warn">{blocked}</p> : null}
      {!detail ? (
        <p className="pop-loading">
          {info.isError ? 'Detalhes indisponíveis.' : 'Carregando detalhes…'}
        </p>
      ) : null}
      {showUnits && detail?.own ? (
        <section aria-label="Tropas na aldeia">
          <h3>Tropas na aldeia</h3>
          {troops.length ? (
            <ul className="pop-grid">
              {troops.map((unit) => (
                <li key={unit.code} title={unit.name}>
                  <img src={unitIconSrc(unit.code)} alt={unit.name} width="26" height="26" />
                  <b>{numbers.format((unit.home ?? 0) + (unit.foreign ?? 0))}</b>
                  {unit.foreign ? <small>({numbers.format(unit.home ?? 0)} suas)</small> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="pop-loading">Nenhuma tropa.</p>
          )}
        </section>
      ) : null}
      {showTimes && travel.length ? (
        <section aria-label="Tempo de viagem">
          <h3>Tempo de viagem</h3>
          <ul className="pop-grid">
            {travel.map((unit) => (
              <li key={unit.code} title={unit.name}>
                <img src={unitIconSrc(unit.code)} alt={unit.name} width="26" height="26" />
                <b>{duration(unit.seconds ?? 0)}</b>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>,
    document.body,
  );
}
